/**
 * API Test Component
 *
 * Tests authenticated communication with the Flask Boilerplate backend
 * via the Next.js API proxy (/api/v1/auth/me).
 */
"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Zap, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react"
import { motion } from "motion/react"

const isBackendConfigured = !!process.env.NEXT_PUBLIC_BACKEND_API_URL

interface FlaskUser {
    user_id: string
    username: string | null
    email: string
    email_verified: boolean
    name: string | null
    given_name: string | null
    family_name: string | null
    image: string | null
    roles: string[]
    client_roles: string[]
    created_at: string
    updated_at: string
}

export function APITest() {
    const { data: session } = authClient.useSession()
    const [apiResponse, setApiResponse] = useState<string>("")
    const [apiLoading, setApiLoading] = useState(false)
    const [apiSuccess, setApiSuccess] = useState<boolean | null>(null)
    const [statusCode, setStatusCode] = useState<number | null>(null)
    const [parsedUser, setParsedUser] = useState<FlaskUser | null>(null)

    const testBackendAPI = async () => {
        setApiLoading(true)
        setApiResponse("")
        setApiSuccess(null)
        setStatusCode(null)
        setParsedUser(null)

        try {
            const res = await fetch("/api/v1/auth/me")
            const status = res.status
            setStatusCode(status)

            let body: Record<string, unknown>
            try {
                body = await res.json()
            } catch {
                setApiResponse(res.statusText || "No response body")
                setApiSuccess(false)
                setApiLoading(false)
                return
            }

            // Check for error in response body or non-OK status
            if (!res.ok || body.error) {
                const errorMsg = (body.error || body.message || res.statusText) as string
                setApiResponse(errorMsg)
                setApiSuccess(false)
            } else {
                setApiResponse(JSON.stringify(body, null, 2))
                setApiSuccess(true)
                // Extract user from Flask response format
                if (body.user && typeof body.user === "object") {
                    setParsedUser(body.user as FlaskUser)
                }
            }
        } catch (e) {
            setApiResponse(e instanceof Error ? e.message : "Network error")
            setApiSuccess(false)
        }

        setApiLoading(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm"
        >
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-foreground">Backend API</h2>
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${isBackendConfigured
                        ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-500 dark:bg-zinc-400/10 dark:text-zinc-400"
                        }`}
                >
                    <span className={`size-1.5 rounded-full ${isBackendConfigured ? "bg-emerald-500 dark:bg-emerald-400" : "bg-zinc-400"
                        }`} />
                    {isBackendConfigured ? "Configured" : "Not configured"}
                </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-muted-foreground">
                    Tests the{" "}
                    <a
                        href="https://github.com/akstspace/flask-boilerplate"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-foreground hover:underline underline-offset-2"
                    >
                        Flask Boilerplate
                        <ExternalLink className="size-3" />
                    </a>
                    {" "}endpoint
                </p>
                <code className="text-[11px] font-mono text-muted-foreground">/api/v1/auth/me</code>
            </div>

            {!isBackendConfigured ? (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Set <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">NEXT_PUBLIC_BACKEND_API_URL</code> in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">.env</code> to enable backend testing.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <Button
                        onClick={testBackendAPI}
                        disabled={!session || apiLoading}
                        className="w-full gap-2"
                    >
                        {apiLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Zap className="size-4" />
                        )}
                        {apiLoading ? "Testing…" : "Test Backend API"}
                    </Button>

                    {!session && (
                        <p className="text-sm text-muted-foreground">
                            Sign in first to test authenticated requests.
                        </p>
                    )}

                    {apiResponse && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.2 }}
                            className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                                {apiSuccess ? (
                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                ) : (
                                    <XCircle className="size-4 text-red-500" />
                                )}
                                <span className="text-xs font-medium text-muted-foreground">
                                    {apiSuccess ? "Success" : "Error"}
                                </span>
                                {statusCode && (
                                    <span className={`ml-auto text-xs font-mono ${apiSuccess ? "text-emerald-500" : "text-red-500"}`}>
                                        {statusCode}
                                    </span>
                                )}
                            </div>

                            {apiSuccess && parsedUser ? (
                                <div className="p-3 space-y-3">
                                    {/* User header */}
                                    <div className="flex items-center gap-3">
                                        {parsedUser.image ? (
                                            <img
                                                src={parsedUser.image}
                                                alt={parsedUser.name || "User"}
                                                className="size-10 rounded-full ring-1 ring-border/50"
                                            />
                                        ) : (
                                            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                                                {(parsedUser.name || parsedUser.email || "?").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{parsedUser.name || "—"}</p>
                                            <p className="text-xs text-muted-foreground truncate">{parsedUser.email}</p>
                                        </div>
                                        {parsedUser.email_verified && (
                                            <span className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 dark:text-emerald-400">
                                                <CheckCircle2 className="size-3" />
                                                Verified
                                            </span>
                                        )}
                                    </div>

                                    {/* Details grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">User ID</span>
                                            <p className="font-mono text-foreground truncate" title={parsedUser.user_id}>{parsedUser.user_id}</p>
                                        </div>
                                        {parsedUser.username && (
                                            <div>
                                                <span className="text-muted-foreground">Username</span>
                                                <p className="text-foreground">{parsedUser.username}</p>
                                            </div>
                                        )}
                                        {parsedUser.roles && parsedUser.roles.length > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Roles</span>
                                                <p className="text-foreground">{parsedUser.roles.join(", ")}</p>
                                            </div>
                                        )}
                                        {parsedUser.client_roles && parsedUser.client_roles.length > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Client Roles</span>
                                                <p className="text-foreground">{parsedUser.client_roles.join(", ")}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timestamps */}
                                    {(parsedUser.created_at || parsedUser.updated_at) && (
                                        <div className="flex items-center gap-4 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                                            {parsedUser.created_at && (
                                                <span>Created {new Date(parsedUser.created_at).toLocaleDateString()}</span>
                                            )}
                                            {parsedUser.updated_at && (
                                                <span>Updated {new Date(parsedUser.updated_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <pre className="p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                                    {apiResponse}
                                </pre>
                            )}
                        </motion.div>
                    )}
                </div>
            )}
        </motion.div>
    )
}
