"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Settings,
    ShieldCheck,
} from "lucide-react"
import { LoginRequired } from "@/components/login-required"
import { AppShellLayout } from "@/components/app-shell"
import { authClient } from "@/lib/auth-client"
import { isPlatformAdmin } from "@/lib/platform-admin"

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: activeOrg } = authClient.useActiveOrganization()
    const { data: session } = authClient.useSession()
    const canAccessAdmin = isPlatformAdmin(session?.user?.role)

    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                <AppShellLayout
                    sidebar={({ closeSidebar }) => (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-3">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {session?.user?.name || "Your account"}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {session?.user?.email || "Signed in"}
                                    </p>
                                    {activeOrg?.name ? (
                                        <p className="mt-2 truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                                            {activeOrg.name}
                                        </p>
                                    ) : null}
                                </div>

                                <nav className="space-y-1">
                                    <Link
                                        href="/settings"
                                        onClick={closeSidebar}
                                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname.startsWith("/settings")
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                            }`}
                                    >
                                        <Settings className="size-4" />
                                        Settings
                                    </Link>

                                    {canAccessAdmin ? (
                                        <Link
                                            href="/admin"
                                            onClick={closeSidebar}
                                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${pathname.startsWith("/admin")
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                }`}
                                        >
                                            <ShieldCheck className="size-4" />
                                            Platform Admin
                                        </Link>
                                    ) : null}
                                </nav>
                            </div>
                        </div>
                    )}
                >
                    {children}
                </AppShellLayout>
            </div>
        </LoginRequired>
    )
}
