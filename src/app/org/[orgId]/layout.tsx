"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Lock, Settings, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { OrgSwitcher } from "@/components/org-switcher"
import { LoginRequired } from "@/components/login-required"
import { authClient } from "@/lib/auth-client"

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const orgId = params.orgId as string

    const handleSignOut = async () => {
        const { error } = await authClient.signOut()
        if (error) {
            console.error("Sign out failed:", error)
            return
        }
        window.location.href = "/login"
    }

    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                {/* Nav */}
                <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
                    <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
                        <div className="flex items-center gap-3">
                            <Link href={`/org/${orgId}`} className="flex items-center gap-2.5">
                                <Lock className="size-5 text-foreground" />
                                <span className="font-semibold text-foreground text-sm tracking-tight hidden sm:inline">Auth UI</span>
                            </Link>
                            <span className="text-border/60 hidden sm:inline">/</span>
                            <OrgSwitcher />
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/org/${orgId}/settings/passkeys`}
                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Settings"
                            >
                                <Settings className="size-4" />
                                <span className="hidden sm:inline">Settings</span>
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <LogOut className="size-4" />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                            <ThemeToggle />
                        </div>
                    </div>
                </nav>
                {children}
            </div>
        </LoginRequired>
    )
}
