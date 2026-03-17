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
import { AppNavbar } from "@/components/app-navbar"

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

    const renderNavItem = (item: NavItem) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
            <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
            >
                <item.icon className="size-4" />
                {item.label}
            </Link>
        )
    }

    return (
        <LoginRequired>
            <div className="min-h-dvh bg-background text-foreground transition-colors duration-200">
                <AppNavbar />

                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <div className="flex flex-col gap-8 md:flex-row">
                    <motion.aside
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="shrink-0 md:w-56"
                    >
                        {canManageOrg && (
                            <>
                                <h2 className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Organization</h2>
                                <nav className="space-y-1">
                                    {ORG_NAV_ITEMS.map(renderNavItem)}
                                </nav>
                            </>
                        )}

                        <h2 className="mb-3 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</h2>
                        <nav className="space-y-1">
                            {ACCOUNT_NAV_ITEMS.map(renderNavItem)}
                        </nav>
                    </motion.aside>

                    <motion.main
                        key={pathname}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                        className="min-w-0 flex-1"
                    >
                        {children}
                    </motion.main>
                </div>
                </div>
            </div>
        </LoginRequired>
    )
}
