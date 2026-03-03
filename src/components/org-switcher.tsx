"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Building2, ChevronDown, Plus, Check } from "lucide-react"

interface Organization {
    id: string
    name: string
    slug: string
    logo: string | null
}

export function OrgSwitcher() {
    const [orgs, setOrgs] = useState<Organization[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const params = useParams()
    const router = useRouter()
    const ref = useRef<HTMLDivElement>(null)
    const currentOrgId = params.orgId as string | undefined

    const [fetchError, setFetchError] = useState(false)

    const fetchOrgs = useCallback(async () => {
        try {
            const { data, error } = await authClient.organization.list()
            if (error) {
                console.error("Failed to load organizations:", error)
                setFetchError(true)
                return
            }
            if (data) setOrgs(data as unknown as Organization[])
            setFetchError(false)
        } catch (err) {
            console.error("Failed to load organizations:", err)
            setFetchError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchOrgs()
    }, [fetchOrgs])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const activeOrg = orgs.find((o) => o.id === currentOrgId)

    const switchOrg = async (orgId: string) => {
        try {
            const { error } = await authClient.organization.setActive({ organizationId: orgId })
            if (error) {
                console.error("Failed to switch organization:", error)
                return
            }
            setOpen(false)
            router.push(`/org/${orgId}`)
        } catch (err) {
            console.error("Failed to switch organization:", err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="size-5 rounded bg-muted animate-pulse" />
                <div className="h-4 w-16 rounded bg-muted animate-pulse hidden sm:block" />
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-red-500">
                <Building2 className="size-3.5" />
                <span className="hidden sm:inline">Failed to load</span>
            </div>
        )
    }

    if (orgs.length === 0) {
        return (
            <button
                onClick={() => router.push(`/org/${currentOrgId || "new"}/settings/organizations`)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Create Org</span>
            </button>
        )
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
            >
                <div className="flex items-center justify-center size-5 rounded bg-muted shrink-0">
                    {activeOrg?.logo ? (
                        <img src={activeOrg.logo} alt="" className="size-5 rounded object-cover" />
                    ) : (
                        <Building2 className="size-3 text-muted-foreground" />
                    )}
                </div>
                <span className="max-w-24 truncate hidden sm:inline">{activeOrg?.name || "Select org"}</span>
                <ChevronDown className={`size-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-border bg-popover shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2 border-b border-border/40">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizations</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {orgs.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => switchOrg(org.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${org.id === currentOrgId
                                    ? "text-foreground bg-muted/50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    }`}
                            >
                                <div className="flex items-center justify-center size-6 rounded bg-muted shrink-0">
                                    {org.logo ? (
                                        <img src={org.logo} alt="" className="size-6 rounded object-cover" />
                                    ) : (
                                        <Building2 className="size-3.5 text-muted-foreground" />
                                    )}
                                </div>
                                <span className="truncate flex-1 text-left">{org.name}</span>
                                {org.id === currentOrgId && <Check className="size-3.5 text-foreground shrink-0" />}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-border/40 py-1">
                        <button
                            onClick={() => { setOpen(false); router.push(`/org/${currentOrgId}/settings/organizations`) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        >
                            <Plus className="size-3.5" />
                            Create Organization
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
