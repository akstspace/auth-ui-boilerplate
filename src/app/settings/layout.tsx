"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
    Users,
    Building2,
    Fingerprint,
    User,
    Shield,
    UsersRound,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { LoginRequired } from "@/components/login-required"
import {
    AppShellLayout,
    AppShellUtilitySection,
    AppSidebarSection,
} from "@/components/app-shell"
import { pageEnterMotion } from "@/lib/motion"

interface NavItem {
    href: string
    label: string
    icon: typeof Users
}

const isOrgManagerRole = (role: string | undefined) => {
    if (!role) return false
    return role
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === "owner" || value === "admin")
}

const ORG_NAV_ITEMS: NavItem[] = [
    { href: "/settings/members", label: "Members", icon: Users },
    { href: "/settings/teams", label: "Teams", icon: UsersRound },
]

const ACCOUNT_NAV_ITEMS: NavItem[] = [
    { href: "/settings/profile", label: "Profile", icon: User },
    { href: "/settings/organizations", label: "Organizations", icon: Building2 },
    { href: "/settings/passkeys", label: "Passkeys", icon: Fingerprint },
    { href: "/settings/security", label: "Security", icon: Shield },
]

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: activeMemberRole } = authClient.useActiveMemberRole()
    const canManageOrg = isOrgManagerRole(activeMemberRole?.role)

    const getNavItemClassName = (item: NavItem) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`
    }

    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                <AppShellLayout
                    contentClassName="max-w-5xl"
                    sidebar={({ closeSidebar }) => (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={pageEnterMotion.transition}
                            className="space-y-6"
                        >
                            {canManageOrg && (
                                <AppSidebarSection title="Organization">
                                    <nav className="space-y-1">
                                        {ORG_NAV_ITEMS.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={closeSidebar}
                                                className={getNavItemClassName(item)}
                                            >
                                                <item.icon className="size-4" />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </nav>
                                </AppSidebarSection>
                            )}

                            <AppSidebarSection title="Account">
                                <nav className="space-y-1">
                                    {ACCOUNT_NAV_ITEMS.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeSidebar}
                                            className={getNavItemClassName(item)}
                                        >
                                            <item.icon className="size-4" />
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>
                            </AppSidebarSection>

                            <AppShellUtilitySection closeSidebar={closeSidebar} />
                        </motion.div>
                    )}
                >
                    <motion.div
                        key={pathname}
                        {...pageEnterMotion}
                        className="min-w-0"
                    >
                        {children}
                    </motion.div>
                </AppShellLayout>
            </div>
        </LoginRequired>
    )
}
