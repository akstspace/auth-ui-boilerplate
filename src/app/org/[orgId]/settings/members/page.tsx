"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Users, Mail, Trash2, Loader2, UserPlus, Crown, Shield, User } from "lucide-react"

interface Member {
    id: string
    userId: string
    role: string
    createdAt: string
    user: { name: string; email: string; image?: string | null }
}

interface Invitation {
    id: string
    email: string
    role: string
    status: string
    expiresAt: string
}

const roleIcons: Record<string, typeof Crown> = { owner: Crown, admin: Shield, member: User }

export default function MembersPage() {
    const params = useParams()
    const orgId = params.orgId as string
    const [members, setMembers] = useState<Member[]>([])
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("member")
    const [inviting, setInviting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const fetchData = useCallback(async () => {
        try {
            const [membersRes, invitationsRes] = await Promise.all([
                authClient.organization.listMembers({ query: { organizationId: orgId } }),
                authClient.organization.listInvitations({ query: { organizationId: orgId } }),
            ])
            // listMembers may return { data: Member[] } or { data: { members: Member[] } }
            const mData = membersRes.data as unknown
            const membersList = Array.isArray(mData)
                ? mData
                : mData && typeof mData === "object" && "members" in mData
                    ? (mData as { members: unknown[] }).members
                    : []
            setMembers(membersList as Member[])

            const iData = invitationsRes.data as unknown
            const invList = Array.isArray(iData)
                ? iData
                : iData && typeof iData === "object" && "invitations" in iData
                    ? (iData as { invitations: unknown[] }).invitations
                    : []
            setInvitations(invList as Invitation[])
        } catch (err) {
            console.error("Failed to load members/invitations:", err)
            setError(err instanceof Error ? err.message : "Failed to load members and invitations.")
        } finally {
            setLoading(false)
        }
    }, [orgId])

    useEffect(() => { fetchData() }, [fetchData])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)
        setError("")
        setSuccess("")
        try {
            const { error: err } = await authClient.organization.inviteMember({
                email: inviteEmail,
                role: inviteRole as "member" | "admin",
                organizationId: orgId,
            })
            if (err) {
                setError(err.message || "Failed to send invitation.")
            } else {
                setSuccess(`Invitation sent to ${inviteEmail}`)
                setInviteEmail("")
                fetchData()
            }
        } catch {
            setError("An unexpected error occurred.")
        } finally {
            setInviting(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error: err } = await authClient.organization.removeMember({
                memberIdOrEmail: memberId,
                organizationId: orgId,
            })
            if (err) {
                setError(err.message || "Failed to remove member.")
                return
            }
            fetchData()
        } catch {
            setError("Failed to remove member.")
        }
    }

    const handleCancelInvitation = async (invitationId: string) => {
        try {
            const { error: err } = await authClient.organization.cancelInvitation({ invitationId })
            if (err) {
                setError(err.message || "Failed to cancel invitation.")
                return
            }
            fetchData()
        } catch {
            setError("Failed to cancel invitation.")
        }
    }

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            const { error: err } = await authClient.organization.updateMemberRole({
                memberId,
                role: newRole as "member" | "admin",
                organizationId: orgId,
            })
            if (err) {
                setError(err.message || "Failed to update role.")
                return
            }
            fetchData()
        } catch {
            setError("Failed to update role.")
        }
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
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-foreground">Members</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your organization&apos;s team members and invitations.</p>
            </div>

            {/* Invite Form */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6"
            >
                <div className="flex items-center gap-2.5 mb-4">
                    <UserPlus className="size-4 text-foreground" />
                    <h2 className="text-sm font-medium text-foreground">Invite Member</h2>
                </div>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <Input
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="flex-1 bg-muted/50 border-border/50"
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="w-[120px] bg-muted/50 border-border/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={inviting} size="sm">
                        {inviting ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                        <span className="ml-1.5">Invite</span>
                    </Button>
                </form>
                <AnimatePresence>
                    {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-red-500 mt-3">{error}</motion.p>
                    )}
                    {success && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-emerald-500 mt-3">{success}</motion.p>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Members List */}
            <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="size-3.5" />
                    Members ({members.length})
                </h2>
                <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30 overflow-hidden">
                    {members.map((member) => {
                        const RIcon = roleIcons[member.role] || User
                        return (
                            <div key={member.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-muted shrink-0">
                                        {member.user.image ? (
                                            <img src={member.user.image} alt="" className="size-8 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-medium text-foreground">{member.user.name?.[0]?.toUpperCase() || "?"}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{member.user.name || "Unnamed"}</p>
                                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <RIcon className="size-3.5 text-muted-foreground" />
                                        {member.role === "owner" ? (
                                            <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                                        ) : (
                                            <Select
                                                value={member.role}
                                                onValueChange={(val) => handleRoleChange(member.id, val)}
                                            >
                                                <SelectTrigger className="h-7 w-[90px] text-xs border-none bg-transparent shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="member">Member</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                    {member.role !== "owner" && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors"
                                            title="Remove member"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {members.length === 0 && (
                        <div className="px-5 py-10 text-center">
                            <Users className="size-8 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No members yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.filter((i) => i.status === "pending").length > 0 && (
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Mail className="size-3.5" />
                        Pending Invitations
                    </h2>
                    <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30 overflow-hidden">
                        {invitations
                            .filter((i) => i.status === "pending")
                            .map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm text-foreground truncate">{inv.email}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCancelInvitation(inv.id)}
                                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}
