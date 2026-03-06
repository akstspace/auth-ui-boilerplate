const INTERNAL_CALLBACK_PREFIX = "/";

export interface AuthFlowParams {
  callbackUrl: string | null;
  invitationId: string | null;
}

const sanitizeCallbackUrl = (value: string | null): string | null => {
  if (!value) return null;
  if (!value.startsWith(INTERNAL_CALLBACK_PREFIX)) return null;
  if (value.startsWith("//")) return null;
  return value;
};

export const getInvitationCallbackUrl = (
  invitationId: string | null,
): string | null => {
  if (!invitationId) return null;
  return `/accept-invitation/${encodeURIComponent(invitationId)}`;
};

export const getAuthFlowParams = (searchParams: {
  get(name: string): string | null;
}): AuthFlowParams => {
  const invitationId = searchParams.get("invitationId");
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  return {
    callbackUrl,
    invitationId,
  };
};

export const resolveCallbackUrl = ({
  callbackUrl,
  invitationId,
}: AuthFlowParams): string => {
  return callbackUrl ?? getInvitationCallbackUrl(invitationId) ?? "/";
};

export const withAuthFlow = (
  pathname: string,
  params: Partial<AuthFlowParams>,
): string => {
  const query = new URLSearchParams();

  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl ?? null);
  if (callbackUrl) query.set("callbackUrl", callbackUrl);

  if (params.invitationId) query.set("invitationId", params.invitationId);

  const qs = query.toString();
  if (!qs) return pathname;
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${qs}`;
};
