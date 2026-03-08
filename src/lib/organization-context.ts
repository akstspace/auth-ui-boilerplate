import { authClient } from "@/lib/auth-client";

/**
 * Switches the active organization and synchronises the active team.
 *
 * - Setting the org is mandatory: any error is returned to the caller.
 * - Setting the team is best-effort: since a user belongs to at most one team
 *   per org, we just read `data[0]` from `listUserTeams`. If that call (or the
 *   subsequent `setActiveTeam`) fails the org switch is still considered
 *   successful — an unset `activeTeamId` is recoverable, a partially-applied
 *   org switch is not.
 */
export const setActiveOrganizationWithTeam = async (
  organizationId: string,
): Promise<{ error: unknown }> => {
  const { error: orgError } = await authClient.organization.setActive({
    organizationId,
  });

  if (orgError) {
    return { error: orgError };
  }

  // Best-effort: resolve the user's (at most one) team in the new org and
  // activate it, or clear the previous active team when there is none.
  try {
    const { data, error: listError } =
      await authClient.organization.listUserTeams();

    if (listError) {
      console.warn("[org-context] Could not list user teams:", listError);
      return { error: null };
    }

    const teamId = Array.isArray(data) ? (data[0]?.id ?? null) : null;

    const { error: teamError } =
      await authClient.organization.setActiveTeam({ teamId });

    if (teamError) {
      console.warn("[org-context] Could not set active team:", teamError);
    }
  } catch (err) {
    console.warn(
      "[org-context] Unexpected error while resolving active team:",
      err,
    );
  }

  return { error: null };
};
