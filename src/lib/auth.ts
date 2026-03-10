import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { member, team, teamMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { APIError } from "better-auth/api";
import {
  jwt,
  lastLoginMethod,
  organization,
  twoFactor,
} from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { sendInvitationEmail, sendVerificationEmail, sendPasswordResetEmail, send2FAEmail } from "@/lib/email";

// ── Team-management helpers ───────────────────────────────────────────────────
// These use Drizzle directly to avoid a circular reference with `auth`.

const isManagerRole = (role: string | undefined | null): boolean =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .some((r) => r === "owner" || r === "admin");

/**
 * Adds a single user to every team in the given organization.
 * Silently ignores duplicate-member errors.
 */
const addUserToAllOrgTeams = async (
  userId: string,
  orgId: string,
): Promise<void> => {
  const orgTeams = await db
    .select({ id: team.id })
    .from(team)
    .where(eq(team.organizationId, orgId));

  for (const t of orgTeams) {
    const alreadyMember = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, t.id), eq(teamMember.userId, userId)))
      .limit(1);

    if (alreadyMember.length === 0) {
      await db.insert(teamMember).values({
        id: crypto.randomUUID(),
        teamId: t.id,
        userId,
        createdAt: new Date(),
      });
    }
  }
};

/**
 * Adds all admin/owner members of an org to the given team.
 * Silently ignores users already in the team.
 */
const addAllOrgManagersToTeam = async (
  teamId: string,
  orgId: string,
): Promise<void> => {
  const orgMembers = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, orgId));

  for (const m of orgMembers) {
    if (!isManagerRole(m.role)) continue;

    const alreadyMember = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, m.userId)))
      .limit(1);

    if (alreadyMember.length === 0) {
      await db.insert(teamMember).values({
        id: crypto.randomUUID(),
        teamId,
        userId: m.userId,
        createdAt: new Date(),
      });
    }
  }
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // ── Account Linking ───────────────────────────────────────────
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  // ── Email & Password Authentication ───────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: sendPasswordResetEmail,
  },

  emailVerification: {
    sendVerificationEmail,
  },

  // ── Social Providers ──────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // ── Plugins ───────────────────────────────────────────────────
  plugins: [
    jwt({
      jwt: {
        definePayload: async ({ user, session }) => {
          const activeOrganizationId = session.activeOrganizationId ?? null;
          let activeOrganizationRole: string | null = null;

          if (activeOrganizationId) {
            try {
              const [membership] = await db
                .select({ role: member.role })
                .from(member)
                .where(
                  and(
                    eq(member.userId, user.id),
                    eq(member.organizationId, activeOrganizationId),
                  ),
                )
                .limit(1);
              activeOrganizationRole = membership?.role ?? null;
            } catch (error) {
              console.error("Failed to resolve active organization role for JWT:", error);
            }
          }

          return {
            ...user,
            org_id: activeOrganizationId,
            team_id: session.activeTeamId ?? null,
            role: activeOrganizationRole,
          };
        },
      },
    }),

    organization({
      allowUserToCreateOrganization: true,
      sendInvitationEmail,
      teams: {
        enabled: true,
        maximumTeams: 25,
        maximumMembersPerTeam: 100,
        defaultTeam: {
          enabled: false,
        },
      },
      organizationHooks: {
        /**
         * Before adding a team member, check inside a transaction (with a
         * SELECT FOR UPDATE lock on the org-member row) that the user is not
         * already in another team within this organization. This prevents a
         * race condition where two concurrent inserts could both pass the
         * plain-SELECT check.
         */
        beforeAddTeamMember: async ({ teamMember: newMember, organization: activeOrg }) => {
          await db.transaction(async (tx) => {
            // Acquire a row-level lock on the org-member record to serialise
            // concurrent requests for the same user in the same org.
            await tx
              .select({ id: member.id })
              .from(member)
              .where(
                and(
                  eq(member.userId, newMember.userId),
                  eq(member.organizationId, activeOrg.id),
                ),
              )
              .for("update");

            const existingTeams = await tx
              .select({ id: teamMember.id })
              .from(teamMember)
              .innerJoin(team, eq(teamMember.teamId, team.id))
              .where(
                and(
                  eq(teamMember.userId, newMember.userId),
                  eq(team.organizationId, activeOrg.id),
                ),
              );

            if (existingTeams.length > 0) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "User is already part of a team in this organization. Users can only be in one team at a time.",
              });
            }
          });
        },

        /**
         * When a new member joins the org as admin/owner, immediately add them
         * to every existing team so `listTeamMembers` works natively for them.
         */
        afterAddMember: async ({ member: newMember, organization: org }) => {
          const isManager = newMember.role
            ?.split(",")
            .map((r: string) => r.trim())
            .some((r: string) => r === "owner" || r === "admin");

          if (!isManager) return;

          await addUserToAllOrgTeams(newMember.userId, org.id);
        },

        /**
         * When a member is promoted to admin/owner, add them to all teams.
         */
        afterUpdateMemberRole: async ({ member: updatedMember, organization: org }) => {
          const isManager = updatedMember.role
            ?.split(",")
            .map((r: string) => r.trim())
            .some((r: string) => r === "owner" || r === "admin");

          if (!isManager) return;

          await addUserToAllOrgTeams(updatedMember.userId, org.id);
        },

        /**
         * When a new team is created, add all current admins/owners to it so
         * they can view and manage its members without needing to join first.
         */
        afterCreateTeam: async ({ team: newTeam, organization: org }) => {
          await addAllOrgManagersToTeam(newTeam.id, org.id);
        },
      },
    }),

    passkey(),

    lastLoginMethod(),

    twoFactor({
      issuer: "Auth UI",
      otpOptions: {
        sendOTP: send2FAEmail,
      },
    }),
  ],

  // ── Rate Limiting ─────────────────────────────────────────────
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 10, max: 5 },
      "/sign-in/passkey": { window: 10, max: 5 },
      "/sign-in/email": { window: 10, max: 5 },
      "/sign-up/email": { window: 10, max: 5 },
      "/two-factor/send-otp": { window: 60, max: 3 },
      "/two-factor/verify-totp": { window: 10, max: 5 },
      "/two-factor/verify-otp": { window: 10, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 3 },
    },
  },

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
