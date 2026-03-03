"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Building2, Loader2, Check, X } from "lucide-react"
import Link from "next/link"

export default function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: invitationId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [accepting, setAccepting] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [rejected, setRejected] = useState(false)
    const [invitation, setInvitation] = useState<{
        id: string
        email: string
        organizationName: string
        organizationSlug: string
        role: string
        inviterEmail: string
    } | null>(null)

    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const { data: session } = await authClient.getSession()
                if (!session) {
                    // Not logged in — redirect to login with return URL
                    window.location.href = `/login?callbackUrl=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`
                    return
                }

                const { data, error: err } = await authClient.organization.getInvitation({
                    query: { id: invitationId },
                })
                if (err || !data) {
                    setError("Invitation not found or has expired.")
                } else {
                    setInvitation({
                        id: data.id,
                        email: data.email,
                        organizationName: (data as Record<string, unknown>).organizationName as string || "Organization",
                        organizationSlug: (data as Record<string, unknown>).organizationSlug as string || "",
                        role: data.role,
                        inviterEmail: (data as Record<string, unknown>).inviterEmail as string || "",
                    })
                }
            } catch {
                setError("Failed to load invitation.")
            } finally {
                setLoading(false)
            }
        }
        fetchInvitation()
    }, [invitationId])

    const handleAccept = async () => {
        setAccepting(true)
        setError("")
        try {
            const { error: err } = await authClient.organization.acceptInvitation({
                invitationId,
            })
            if (err) {
                setError(err.message || "Failed to accept invitation.")
            } else {
                setSuccess(true)
                setTimeout(() => router.push("/"), 2000)
            }
        } catch {
            setError("An unexpected error occurred.")
        } finally {
            setAccepting(false)
        }
    }

    const handleReject = async () => {
        setRejecting(true)
        setError("")
        try {
            const { error: err } = await authClient.organization.rejectInvitation({
                invitationId,
            })
            if (err) {
                setError(err.message || "Failed to reject invitation.")
            } else {
                setRejected(true)
            }
        } catch {
            setError("An unexpected error occurred.")
        } finally {
            setRejecting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-dvh bg-background flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-sm"
            >
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8">
                    {success ? (
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center size-12 rounded-full bg-emerald-500/10 mx-auto">
                                <Check className="size-6 text-emerald-500" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">You&apos;re in!</h2>
                            <p className="text-sm text-muted-foreground">
                                You&apos;ve joined <strong className="text-foreground">{invitation?.organizationName}</strong>. Redirecting…
                            </p>
                        </div>
                    ) : rejected ? (
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center size-12 rounded-full bg-muted mx-auto">
                                <X className="size-6 text-muted-foreground" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">Invitation declined</h2>
                            <p className="text-sm text-muted-foreground text-pretty">
                                You&apos;ve declined the invitation to {invitation?.organizationName}.
                            </p>
                            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Go to dashboard →
                            </Link>
                        </div>
                    ) : error && !invitation ? (
                        <div className="text-center space-y-3">
                            <div className="flex items-center justify-center size-12 rounded-full bg-red-500/10 mx-auto">
                                <X className="size-6 text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">Invalid invitation</h2>
                            <p className="text-sm text-muted-foreground text-pretty">{error}</p>
                            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Go to dashboard →
                            </Link>
                        </div>
                    ) : invitation ? (
                        <div className="space-y-6">
                            <div className="text-center space-y-3">
                                <div className="flex items-center justify-center size-12 rounded-full bg-muted mx-auto">
                                    <Building2 className="size-6 text-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">You&apos;re invited</h2>
                                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                                        You&apos;ve been invited to join <strong className="text-foreground">{invitation.organizationName}</strong> as a <strong className="text-foreground">{invitation.role}</strong>.
                                    </p>
                                    {invitation.inviterEmail && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Invited by {invitation.inviterEmail}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div role="alert" className="text-sm text-red-500 dark:text-red-400 text-center py-1">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleReject}
                                    disabled={rejecting || accepting}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {rejecting ? <Loader2 className="size-4 animate-spin" /> : "Decline"}
                                </Button>
                                <Button
                                    onClick={handleAccept}
                                    disabled={accepting || rejecting}
                                    className="flex-1"
                                >
                                    {accepting ? <Loader2 className="size-4 animate-spin" /> : "Accept"}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    )
}
