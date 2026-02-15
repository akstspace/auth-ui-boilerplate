/**
 * Backend API Client (Fetch-based)
 *
 * A generic API client for communicating with any external backend service.
 * Uses JWT bearer tokens issued by better-auth for authentication.
 *
 * HOW IT WORKS:
 * 1. The client obtains a JWT from better-auth via `authClient.token()`.
 * 2. The JWT is cached in memory and reused until it's close to expiry (10s buffer).
 * 3. Each request includes the JWT in the `Authorization: Bearer <token>` header.
 * 4. Your backend service verifies this token using the JWKS endpoint exposed by
 *    better-auth at `/api/auth/jwks`. See the /integration page for backend examples.
 *
 * CONFIGURATION:
 * Set `NEXT_PUBLIC_BACKEND_API_URL` in your environment to point to your backend.
 * Defaults to http://localhost:8080 for local development.
 *
 * SECURITY NOTES:
 * - Tokens are short-lived JWTs signed with the server's private key (Ed25519 by default).
 * - The backend should always validate the token signature via JWKS, not just decode it.
 * - In production, always use HTTPS for both the auth server and the backend.
 */

import authClient from "./auth-client"
import { decodeJwt } from "jose"

/** The base URL for your backend API service */
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8080"

/** Standard API response wrapper with typed data or error */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

/** Example user profile shape — adjust to match your backend */
export interface UserProfile {
  id: string
  email: string
  name: string
}

/** Example auth verification response — adjust to match your backend */
export interface AuthVerifyResponse {
  valid: boolean
  userId?: string
  email?: string
}

/**
 * ApiClient — a lightweight fetch-based HTTP client with automatic JWT injection.
 *
 * The client caches the JWT and refreshes it when close to expiration.
 * All requests are sent with `Content-Type: application/json` and the
 * `Authorization: Bearer <token>` header.
 */
class ApiClient {
  private baseUrl: string
  private cachedToken: string | null

  constructor(baseUrl: string = BACKEND_API_URL) {
    this.baseUrl = baseUrl
    this.cachedToken = null
  }

  /**
   * Checks if the cached token is still valid.
   * Returns false if no token is cached or if the token expires within 10 seconds.
   */
  private isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false
    }

    const jwt = decodeJwt(this.cachedToken)
    if (!jwt.exp) {
      return false
    }

    // Add a 10-second buffer to avoid using tokens that are about to expire
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return jwt.exp > currentTimeInSeconds + 10
  }

  /**
   * Retrieves a valid JWT token, using the cache when possible.
   * Calls better-auth's token endpoint to get a fresh JWT if needed.
   */
  private async getToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.cachedToken
    }

    // Request a new JWT from better-auth
    const token = await authClient.token().then(x => x.data?.token) || null

    this.cachedToken = token

    return token
  }

  /**
   * Makes an authenticated HTTP request to the backend.
   *
   * Automatically injects the JWT bearer token into the Authorization header.
   * Returns a standardized ApiResponse with either `data` or `error`.
   *
   * @param endpoint - The API path (e.g., "/api/users/me")
   * @param options  - Standard fetch RequestInit options
   */
  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken()

      // Build headers: merge defaults, auth, and caller-supplied headers
      const mergedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Only inject Authorization if we have a valid token
      if (token) {
        mergedHeaders["Authorization"] = `Bearer ${token}`
      }

      // Send the request, preserving any caller-supplied headers
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...mergedHeaders,
          ...(options.headers as Record<string, string>),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          error: data.message || `API Error: ${response.status} ${response.statusText}`,
          status: response.status,
        }
      }

      return {
        data,
        status: response.status,
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        status: 0,
      }
    }
  }

  /**
   * Example: Verify the current user's authentication against the backend.
   * Your backend should have a corresponding endpoint that validates the JWT
   * and returns user information.
   */
  async verifyAuth(): Promise<ApiResponse<AuthVerifyResponse>> {
    return this.request("/api/auth/verify", {
      method: "GET",
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
