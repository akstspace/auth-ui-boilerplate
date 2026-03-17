"use client"

import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import {
    Building2,
    Fingerprint,
    Users,
    BookOpen,
    Loader2,
    ShieldCheck,
    UsersRound,
} from "lucide-react"
import Link from "next/link"
import { isPlatformAdmin } from "@/lib/platform-admin"

const isOrgManagerRole = (role: string | undefined) => {
    if (!role) return false
    return role
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === "owner" || value === "admin")
}

export default function OrgDashboard() {
    const { data: activeOrg, isPending } = authClient.useActiveOrganization()
    const { data: activeMemberRole, isPending: isRolePending } = authClient.useActiveMemberRole()
    const { data: session } = authClient.useSession()

    if (isPending || isRolePending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const canManageOrg = isOrgManagerRole(activeMemberRole?.role)
    const canAccessPlatformAdmin = isPlatformAdmin(session?.user?.role)

    const cards = [
        ...(canManageOrg
            ? [
                  {
                      href: "/settings/members",
                      icon: Users,
                      title: "Members",
                      desc: "Invite and manage organization members",
                  },
                  {
                      href: "/settings/organizations",
                      icon: Building2,
                      title: "Organizations",
                      desc: "Manage organization details and lifecycle",
                  },
                  {
                      href: "/settings/teams",
                      icon: UsersRound,
                      title: "Teams",
                      desc: "Organize members into teams and manage team membership",
                  },
              ]
            : []),
        {
            href: "/settings/passkeys",
            icon: Fingerprint,
            title: "Passkeys",
            desc: "Manage passwordless login and account security",
        },
        {
            href: "/guide",
            icon: BookOpen,
            title: "Integration Guide",
            desc: "Backend setup and JWT docs",
        },
        ...(canAccessPlatformAdmin
            ? [
                  {
                      href: "/admin",
                      icon: ShieldCheck,
                      title: "Platform Admin",
                      desc: "Manage platform users, sessions, bans, and impersonation",
                  },
              ]
            : []),
    ]

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6">
            <section className="pb-10 pt-12">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground">
                        {activeOrg?.name || "Dashboard"}
                    </h1>
                    <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
                        Welcome to your organization workspace. Manage your team, security settings, and integrations.
                    </p>
                </motion.div>
            </section>

            <section className="pb-16">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {cards.map((card, i) => (
                        <motion.div
                            key={card.href}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.06 }}
                        >
                            <Link
                                href={card.href}
                                className="group block h-full rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border"
                            >
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/80">
                                        <card.icon className="size-5 text-foreground" />
                                    </div>
                                </div>
                                <h3 className="mb-1 text-sm font-medium text-foreground">{card.title}</h3>
                                <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{card.desc}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </main>
    )
}
