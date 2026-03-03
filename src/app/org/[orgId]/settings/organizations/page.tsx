"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react"

interface Organization {
    id: string
    name: string
    slug: string
    logo: string | null
    createdAt: string
}

export default function OrganizationsPage() {
    const params = useParams()
    const router = useRouter()
    const currentOrgId = params.orgId as string
    const [orgs, setOrgs] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [creating, setCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editSlug, setEditSlug] = useState("")
    const [error, setError] = useState("")

    const fetchOrgs = useCallback(async () => {
        try {
            const { data } = await authClient.organization.list()
            if (data) setOrgs(data as unknown as Organization[])
        } catch { /* silent */ } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchOrgs() }, [fetchOrgs])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setError("")
        try {
            const slug = newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
            const { data, error: err } = await authClient.organization.create({ name: newName, slug })
            if (err) { setError(err.message || "Failed to create."); return }
            if (data) {
                await authClient.organization.setActive({ organizationId: data.id })
                router.push(`/org/${data.id}`)
            }
        } catch { setError("Unexpected error.") } finally { setCreating(false) }
    }

    const handleUpdate = async (orgId: string) => {
        setError("")
        try {
            const { error: err } = await authClient.organization.update({
                organizationId: orgId,
                data: { name: editName, slug: editSlug },
            })
            if (err) { setError(err.message || "Failed to update."); return }
            setEditingId(null)
            fetchOrgs()
        } catch { setError("Unexpected error.") }
    }

    const handleDelete = async (orgId: string) => {
        if (!confirm("Are you sure? This will delete the organization and remove all members.")) return
        try {
            const { error: err } = await authClient.organization.delete({ organizationId: orgId })
            if (err) {
                setError(err.message || "Failed to delete organization.")
                return
            }
            if (orgId === currentOrgId) {
                router.push("/")
            } else {
                fetchOrgs()
            }
        } catch { setError("Failed to delete organization.") }
    }

    const startEdit = (org: Organization) => {
        setEditingId(org.id)
        setEditName(org.name)
        setEditSlug(org.slug)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Organizations</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your organizations.</p>
                </div>
                <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="size-3.5 mr-1.5" />
                    New
                </Button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Create Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleCreate} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
                            <Input
                                placeholder="Organization name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                                autoFocus
                                className="bg-muted/50 border-border/50"
                            />
                            <div className="flex gap-3">
                                <Button type="submit" disabled={creating} size="sm">
                                    {creating ? "Creating…" : "Create Organization"}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orgs List */}
            <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30 overflow-hidden">
                {orgs.map((org) => (
                    <div key={org.id} className={`px-5 py-4 transition-colors ${org.id === currentOrgId ? "bg-muted/30" : "hover:bg-muted/20"}`}>
                        {editingId === org.id ? (
                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50 border-border/50 h-8 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Slug</label>
                                        <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="bg-muted/50 border-border/50 h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(org.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors" title="Save" aria-label="Save organization">
                                        <Check className="size-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel" aria-label="Cancel editing">
                                        <X className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                                        {org.logo ? (
                                            <img src={org.logo} alt="" className="size-9 rounded-lg object-cover" />
                                        ) : (
                                            <Building2 className="size-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                                            {org.id === currentOrgId && (
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">Active</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{org.slug} · {org.id.slice(0, 8)}…</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => startEdit(org)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit" aria-label="Edit organization">
                                        <Pencil className="size-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(org.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete" aria-label="Delete organization">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {orgs.length === 0 && (
                    <div className="px-5 py-10 text-center">
                        <Building2 className="size-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No organizations yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
