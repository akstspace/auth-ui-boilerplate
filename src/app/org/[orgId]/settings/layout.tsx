"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { motion } from "motion/react"
import { Users, Building2, Fingerprint } from "lucide-react"

const getOrgNavItems = (orgId: string) => [
    { href: `/org/${orgId}/settings/members`, label: "Members", icon: Users },
    { href: `/org/${orgId}/settings/organizations`, label: "Organizations", icon: Building2 },
]

const getAccountNavItems = (orgId: string) => [
    { href: `/org/${orgId}/settings/passkeys`, label: "Passkeys", icon: Fingerprint },
]

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const pathname = usePathname()
    const orgId = params.orgId as string
    const orgNavItems = getOrgNavItems(orgId)
    const accountNavItems = getAccountNavItems(orgId)

    const renderNavItem = (item: { href: string; label: string; icon: typeof Users }) => {
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                <motion.aside
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="md:w-56 shrink-0"
                >
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">Organization</h2>
                    <nav className="space-y-1">
                        {orgNavItems.map(renderNavItem)}
                    </nav>

                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 mt-6 px-3">Account</h2>
                    <nav className="space-y-1">
                        {accountNavItems.map(renderNavItem)}
                    </nav>
                </motion.aside>

                <motion.main
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    className="flex-1 min-w-0"
                >
                    {children}
                </motion.main>
            </div>
        </div>
    )
}
