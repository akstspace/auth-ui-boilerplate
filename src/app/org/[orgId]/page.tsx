"use client"

import { useParams } from "next/navigation"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Building2, Fingerprint, Users, BookOpen, Loader2 } from "lucide-react"
import Link from "next/link"

export default function OrgDashboard() {
    const params = useParams()
    const orgId = params.orgId as string
    const { data: activeOrg, isPending } = authClient.useActiveOrganization()

    if (isPending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const cards = [
        { href: `/org/${orgId}/settings/members`, icon: Users, title: "Members", desc: "Invite and manage team members" },
        { href: `/org/${orgId}/settings/organizations`, icon: Building2, title: "Organizations", desc: "Manage your organizations" },
        { href: `/org/${orgId}/settings/passkeys`, icon: Fingerprint, title: "Passkeys", desc: "Manage passwordless login" },
        { href: "/guide", icon: BookOpen, title: "Integration Guide", desc: "Backend setup and JWT docs" },
    ]

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6">
            <section className="pt-12 pb-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground">
                        {activeOrg?.name || "Dashboard"}
                    </h1>
                    <p className="mt-2 text-muted-foreground text-pretty max-w-2xl">
                        Welcome to your organization workspace. Manage your team, security settings, and integrations.
                    </p>
                </motion.div>
            </section>

            <section className="pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cards.map((card, i) => (
                        <motion.div
                            key={card.href}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.06 }}
                        >
                            <Link
                                href={card.href}
                                className="group block h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:-translate-y-0.5 transition-all duration-200 hover:border-border"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center justify-center size-10 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                                        <card.icon className="size-5 text-foreground" />
                                    </div>
                                </div>
                                <h3 className="font-medium text-foreground text-sm mb-1">{card.title}</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{card.desc}</p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </main>
    )
}
