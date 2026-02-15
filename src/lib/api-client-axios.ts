/**
 * Backend API Client (Axios-based)
 *
 * An alternative API client using Axios instead of fetch.
 * Provides the same JWT-based authentication but with Axios features like
 * interceptors, automatic JSON handling, and request/response transforms.
 *
 * HOW IT WORKS:
 * 1. An Axios request interceptor automatically fetches a JWT from better-auth
 *    before each request and injects it into the Authorization header.
 * 2. A response interceptor handles errors uniformly.
 * 3. Your backend verifies the JWT using the JWKS endpoint at `/api/auth/jwks`.
 *
 * WHEN TO USE THIS vs api-client.ts:
 * - Use this if you prefer Axios features (interceptors, cancel tokens, progress events).
 * - Use api-client.ts (fetch-based) for a zero-dependency approach.
 *
 * CONFIGURATION:
 * Set `NEXT_PUBLIC_BACKEND_API_URL` in your environment to point to your backend.
 * Defaults to http://localhost:8080 for local development.
 */

import axios, { AxiosInstance, AxiosError } from "axios"
import authClient from "./auth-client"

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
 * ApiClientAxios — an Axios-based HTTP client with automatic JWT injection
 * via request interceptors.
 *
 * Unlike the fetch-based client, this variant uses Axios interceptors to
 * inject the JWT token before every request, so you don't need to manage
 * token caching manually — better-auth's client handles that.
 */
class ApiClientAxios {
    private axiosInstance: AxiosInstance

    constructor(baseUrl: string = BACKEND_API_URL) {
        // Create a configured Axios instance with the backend base URL
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                "Content-Type": "application/json",
            },
        })

        /**
         * REQUEST INTERCEPTOR
         * Runs before every outgoing request. Fetches a JWT from better-auth
         * and attaches it as a Bearer token in the Authorization header.
         */
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                const token = await authClient.token().then(x => x.data?.token)
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error) => {
                return Promise.reject(error)
            }
        )

        /**
         * RESPONSE INTERCEPTOR
         * Handles response errors uniformly. You can extend this to handle
         * specific status codes (e.g., 401 for token refresh, 403 for forbidden).
         */
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                return Promise.reject(error)
            }
        )
    }

    /**
     * Makes an authenticated HTTP request to the backend.
     * The JWT is automatically injected by the request interceptor.
     *
     * @param endpoint - The API path (e.g., "/api/users/me")
     * @param options  - Method, data, and query params
     */
    private async request<T = unknown>(
        endpoint: string,
        options: {
            method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
            data?: unknown
            params?: Record<string, unknown>
        } = {}
    ): Promise<ApiResponse<T>> {
        try {
            const response = await this.axiosInstance.request<T>({
                url: endpoint,
                method: options.method || "GET",
                data: options.data,
                params: options.params,
            })

            return {
                data: response.data,
                status: response.status,
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    error: error.response?.data?.message || error.message || `API Error: ${error.response?.status} ${error.response?.statusText}`,
                    status: error.response?.status || 0,
                }
            }
            return {
                error: error instanceof Error ? error.message : "Unknown error occurred",
                status: 0,
            }
        }
    }

    /**
     * Example: Verify the current user's authentication against the backend.
     * Your backend should have a corresponding endpoint that validates the JWT.
     */
    async verifyAuth(): Promise<ApiResponse<AuthVerifyResponse>> {
        return this.request("/api/auth/verify", {
            method: "GET",
        })
    }
}

export const apiClientAxios = new ApiClientAxios()
export default apiClientAxios
