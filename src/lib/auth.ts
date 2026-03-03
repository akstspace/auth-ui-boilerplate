import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { jwt, organization, lastLoginMethod } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // ── Social Providers ──────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // ── Plugins ───────────────────────────────────────────────────
  plugins: [
    jwt(),

    organization({
      allowUserToCreateOrganization: true,
      async sendInvitationEmail(data) {
        const baseURL =
          process.env.BETTER_AUTH_URL || "http://localhost:3000";
        const inviteLink = `${baseURL}/accept-invitation/${data.id}`;

        await sendEmail({
          to: data.email,
          subject: `You've been invited to ${data.organization.name}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">You're invited!</h2>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                <strong>${data.inviter.user.name}</strong> (${data.inviter.user.email}) has invited you to join
                <strong>${data.organization.name}</strong> as a <strong>${data.role}</strong>.
              </p>
              <a href="${inviteLink}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
                Accept Invitation
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 24px;">
                Or copy this link: ${inviteLink}
              </p>
            </div>
          `,
        });
      },
    }),

    passkey(),

    lastLoginMethod(),
  ],

  // ── Rate Limiting ─────────────────────────────────────────────
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 10, max: 5 },
      "/sign-in/passkey": { window: 10, max: 5 },
    },
  },

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
