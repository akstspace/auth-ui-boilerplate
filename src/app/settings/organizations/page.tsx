"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { generateSlug } from "@/lib/utils"
import { setActiveOrganizationWithTeam } from "@/lib/organization-context"

interface Organization {
    id: string
    name: string
    slug: string
    logo: string | null
    createdAt: string
}

const isOrgManagerRole = (role: string | undefined) => {
    if (!role) return false
    return role
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === "owner" || value === "admin")
}

export default function OrganizationsPage() {
    const router = useRouter()
    const { data: activeOrg } = authClient.useActiveOrganization()
    const { data: activeMemberRole, isPending: roleLoading } = authClient.useActiveMemberRole()
    const currentOrgId = activeOrg?.id

    const [orgs, setOrgs] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [creating, setCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editSlug, setEditSlug] = useState("")
    const [error, setError] = useState("")
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orgId: string; orgName: string }>({ open: false, orgId: "", orgName: "" })
    const [deletingOrganizationId, setDeletingOrganizationId] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState("")

    const canManageActiveOrg = isOrgManagerRole(activeMemberRole?.role)

    const fetchOrgs = useCallback(async () => {
        try {
            const { data, error: listError } = await authClient.organization.list()
            if (listError) {
                setError(getAuthErrorMessage(listError, "Failed to load organizations."))
                return
            }
            if (data) setOrgs(data as unknown as Organization[])
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to load organizations."))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (roleLoading) return
        fetchOrgs()
    }, [fetchOrgs, roleLoading])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setError("")
        try {
            const trimmed = newName.trim()
            const slug = generateSlug(trimmed)
            if (!slug) {
                setError("Organization name must contain at least one letter or number.")
                setCreating(false)
                return
            }
            const { data, error: err } = await authClient.organization.create({ name: trimmed, slug })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to create organization."))
                return
            }
            if (data) {
                const { error: activeError } = await setActiveOrganizationWithTeam(data.id)
                if (activeError) {
                    setError(getAuthErrorMessage(activeError, "Failed to activate organization."))
                    return
                }
                router.push("/org")
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "Unexpected error."))
        } finally {
            setCreating(false)
        }
    }

    const handleUpdate = async (orgId: string) => {
        setError("")
        try {
            const { error: err } = await authClient.organization.update({
                organizationId: orgId,
                data: { name: editName, slug: editSlug },
            })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to update organization."))
                return
            }
            setEditingId(null)
            fetchOrgs()
        } catch (err) {
            setError(getAuthErrorMessage(err, "Unexpected error."))
        }
    }

    const handleDelete = (orgId: string, orgName: string) => {
        setDeleteError("")
        setDeleteConfirm({ open: true, orgId, orgName })
    }

    const handleConfirmDelete = async () => {
        const { orgId } = deleteConfirm
        setDeletingOrganizationId(orgId)
        setDeleteError("")
        try {
            const { error: err } = await authClient.organization.delete({ organizationId: orgId })
            if (err) {
                setDeleteError(getAuthErrorMessage(err, "Failed to delete organization."))
                return
            }
            setDeleteConfirm({ open: false, orgId: "", orgName: "" })
            if (orgId === currentOrgId) {
                router.push("/")
            } else {
                fetchOrgs()
            }
        } catch (err) {
            setDeleteError(getAuthErrorMessage(err, "Failed to delete organization."))
        } finally {
            setDeletingOrganizationId(null)
        }
    }

    const startEdit = (org: Organization) => {
        setEditingId(org.id)
        setEditName(org.name)
        setEditSlug(org.slug)
    }

    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <>
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Organizations</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage your organizations.</p>
                </div>
                <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-1.5 size-3.5" />
                    New
                </Button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
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

            <div className="overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30">
                {orgs.map((org) => (
                    <div key={org.id} className={`px-5 py-4 transition-colors ${org.id === currentOrgId ? "bg-muted/30" : "hover:bg-muted/20"}`}>
                        {editingId === org.id ? (
                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 bg-muted/50 border-border/50 text-sm" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Slug</label>
                                        <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="h-8 bg-muted/50 border-border/50 text-sm" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(org.id)} className="text-emerald-500 transition-colors hover:text-emerald-400" title="Save" aria-label="Save organization">
                                        <Check className="size-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-muted-foreground transition-colors hover:text-foreground" title="Cancel" aria-label="Cancel editing">
                                        <X className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        {org.logo ? (
                                            <img src={org.logo} alt="" className="size-9 rounded-lg object-cover" />
                                        ) : (
                                            <Building2 className="size-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                                            {org.id === currentOrgId && (
                                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Active</span>
                                            )}
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">{org.slug} · {org.id.slice(0, 8)}…</p>
                                    </div>
                                </div>
                                {canManageActiveOrg && org.id === currentOrgId && (
                                <div className="flex shrink-0 items-center gap-2">
                                    <button onClick={() => startEdit(org)} className="text-muted-foreground transition-colors hover:text-foreground" title="Edit" aria-label="Edit organization">
                                        <Pencil className="size-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(org.id, org.name)} disabled={deletingOrganizationId === org.id} className="text-muted-foreground transition-colors hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" title="Delete" aria-label="Delete organization">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {orgs.length === 0 && (
                    <div className="px-5 py-10 text-center">
                        <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No organizations yet.</p>
                    </div>
                )}
            </div>
        </div>

        <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((s) => ({ ...s, open }))}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Organization</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirm.orgName}</span>? This will permanently remove the organization and all its members.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    {deleteError && <p className="mr-auto text-sm text-red-500">{deleteError}</p>}
                    <Button variant="ghost" disabled={!!deletingOrganizationId} onClick={() => setDeleteConfirm({ open: false, orgId: "", orgName: "" })}>
                        Cancel
                    </Button>
                    <Button variant="destructive" disabled={!!deletingOrganizationId} onClick={handleConfirmDelete}>
                        {deletingOrganizationId ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Deleting…</> : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
