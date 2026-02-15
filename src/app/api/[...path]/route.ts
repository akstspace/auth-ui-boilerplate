/**
 * API Proxy Route
 *
 * This catch-all route proxies requests from the Next.js frontend to your
 * external backend API service. It handles JWT token injection automatically.
 *
 * HOW IT WORKS:
 * 1. Any request to /api/* (except /api/auth/*) is caught by this handler.
 * 2. The handler fetches a JWT from better-auth using the current user's session.
 * 3. The JWT is injected into the Authorization header as a Bearer token.
 * 4. The request is forwarded to BACKEND_API_URL with all original headers,
 *    query params, and body intact.
 * 5. The backend response is returned to the client as-is.
 *
 * WHY USE A PROXY:
 * - Avoids CORS issues between frontend and backend.
 * - Keeps the backend URL private (not exposed to the browser).
 * - Centralizes JWT token injection in one place.
 *
 * SECURITY CONSIDERATIONS:
 * - The JWT is generated server-side, so it's never exposed to client-side JS.
 * - The backend should still validate the JWT signature via JWKS.
 * - Set BACKEND_API_URL to an internal/private network URL in production.
 *
 * CONFIGURATION:
 * Set `BACKEND_API_URL` (server-side only) in your .env file.
 * Defaults to http://localhost:8080 for local development.
 */

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/** The backend API URL — server-side only, not exposed to the browser */
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080'

/**
 * Universal handler for all HTTP methods.
 * Proxies the request to the backend with JWT authentication.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Reconstruct the target path from the catch-all segments
  const path = await params.then(x => x.path.join('/'))

  // Build the full backend URL, preserving query parameters
  const url = new URL(`/api/${path}`, BACKEND_API_URL)
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  // Clone request headers and remove the host header (will be set by fetch)
  const rheaders = new Headers(request.headers)
  rheaders.delete('host')

  try {
    // Get a JWT from better-auth for the current session
    const { token } = await auth.api.getToken({
      headers: await headers(),
    })
    
    // Inject the JWT as a Bearer token
    rheaders.set("Authorization", `Bearer ${token}`)

    // Forward the request to the backend
    const response = await fetch(url.toString(), {
      method: request.method,
      headers: rheaders,
      body: request.body,
      duplex: 'half',
    } as RequestInit)

    // Clean up response headers that could conflict with Next.js streaming
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
    responseHeaders.delete('transfer-encoding')

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    )
  }
}

// Export handler for all HTTP methods
export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
export const HEAD = handler
export const OPTIONS = handler
