"use client";

import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { lastLoginMethodClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    jwtClient(),
    organizationClient(),
    passkeyClient(),
    lastLoginMethodClient(),
  ],
  fetchOptions: {
    onError: async (ctx) => {
      if (ctx.response.status === 429) {
        console.warn("[Auth] Rate limited — please try again shortly.");
      }
    },
  },
});
