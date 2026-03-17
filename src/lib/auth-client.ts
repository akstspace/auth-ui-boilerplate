"use client";

import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { lastLoginMethodClient, twoFactorClient } from "better-auth/client/plugins";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { withAuthFlow } from "@/lib/auth-flow";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    jwtClient(),
    organizationClient({
      teams: { enabled: true },
    }),
    passkeyClient(),
    lastLoginMethodClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        const params = new URLSearchParams(window.location.search);
        window.location.href = withAuthFlow("/2fa", {
          callbackUrl: params.get("callbackUrl"),
          invitationId: params.get("invitationId"),
        });
      },
    }),
    adminClient(),
  ],
  fetchOptions: {
    onError: async (ctx) => {
      if (ctx.response.status === 429) {
        console.warn("[Auth] Rate limited — please try again shortly.");
        return;
      }
      console.log(
        "[Auth] Request failed:",
        getAuthErrorMessage(ctx.error, "Unexpected authentication error."),
      );
    },
  },
});
