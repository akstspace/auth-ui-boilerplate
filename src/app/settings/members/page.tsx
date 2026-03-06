"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Users, Mail, Trash2, Loader2, UserPlus, Crown, Shield, User, UsersRound } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"

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
    teamId?: string | null
    expiresAt: string
}

interface Team {
    id: string
    name: string
}

const roleIcons: Record<string, typeof Crown> = { owner: Crown, admin: Shield, member: User }

const isOrgManagerRole = (role: string | undefined) => {
    if (!role) return false
    return role
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === "owner" || value === "admin")
}

const NONE_TEAM_VALUE = "__none__"

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("member")
    const [inviteTeamId, setInviteTeamId] = useState(NONE_TEAM_VALUE)
    const [inviting, setInviting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const { data: activeMemberRole, isPending: roleLoading } = authClient.useActiveMemberRole()
    const canManageOrg = isOrgManagerRole(activeMemberRole?.role)

    const fetchData = useCallback(async () => {
        try {
            const [membersRes, invitationsRes, teamsRes] = await Promise.all([
                authClient.organization.listMembers(),
                authClient.organization.listInvitations(),
                authClient.organization.listTeams(),
            ])

            if (membersRes.error) {
                setError(getAuthErrorMessage(membersRes.error, "Failed to load members."))
                return
            }
            if (invitationsRes.error) {
                setError(getAuthErrorMessage(invitationsRes.error, "Failed to load invitations."))
                return
            }
            if (teamsRes.error) {
                setError(getAuthErrorMessage(teamsRes.error, "Failed to load teams."))
                return
            }

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

            const tData = teamsRes.data as unknown
            setTeams((Array.isArray(tData) ? tData : []) as Team[])
        } catch (err) {
            console.error("Failed to load members/invitations:", err)
            setError(getAuthErrorMessage(err, "Failed to load members and invitations."))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (roleLoading) return
        if (!canManageOrg) {
            setLoading(false)
            return
        }
        fetchData()
    }, [canManageOrg, fetchData, roleLoading])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)
        setError("")
        setSuccess("")
        try {
            const { error: err } = await authClient.organization.inviteMember({
                email: inviteEmail,
                role: inviteRole as "member" | "admin",
                ...(inviteTeamId !== NONE_TEAM_VALUE ? { teamId: inviteTeamId } : {}),
            })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to send invitation."))
            } else {
                setSuccess(`Invitation sent to ${inviteEmail}`)
                setInviteEmail("")
                setInviteTeamId(NONE_TEAM_VALUE)
                fetchData()
            }
        } catch (err) {
            setError(getAuthErrorMessage(err, "An unexpected error occurred."))
        } finally {
            setInviting(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error: err } = await authClient.organization.removeMember({
                memberIdOrEmail: memberId,
            })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to remove member."))
                return
            }
            fetchData()
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to remove member."))
        }
    }

    const handleCancelInvitation = async (invitationId: string) => {
        try {
            const { error: err } = await authClient.organization.cancelInvitation({ invitationId })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to cancel invitation."))
                return
            }
            fetchData()
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to cancel invitation."))
        }
    }

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            const { error: err } = await authClient.organization.updateMemberRole({
                memberId,
                role: newRole as "member" | "admin",
            })
            if (err) {
                setError(getAuthErrorMessage(err, "Failed to update role."))
                return
            }
            fetchData()
        } catch (err) {
            setError(getAuthErrorMessage(err, "Failed to update role."))
        }
    }

    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!canManageOrg) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
                <h1 className="text-xl font-bold text-foreground">Members</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Only organization owners and admins can manage members, invitations, and team assignments.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold text-foreground">Members</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage your organization&apos;s team members and invitations.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
            >
                <div className="mb-4 flex items-center gap-2.5">
                    <UserPlus className="size-4 text-foreground" />
                    <h2 className="text-sm font-medium text-foreground">Invite Member</h2>
                </div>
                <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                    <Input
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="bg-muted/50 border-border/50"
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="w-full bg-muted/50 border-border/50 sm:w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={inviteTeamId} onValueChange={setInviteTeamId}>
                        <SelectTrigger className="w-full bg-muted/50 border-border/50 sm:w-[170px]">
                            <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE_TEAM_VALUE}>No team</SelectItem>
                            {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={inviting} size="sm">
                        {inviting ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                        <span className="ml-1.5">Invite</span>
                    </Button>
                </form>
                <AnimatePresence>
                    {error && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-red-500">{error}</motion.p>
                    )}
                    {success && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-emerald-500">{success}</motion.p>
                    )}
                </AnimatePresence>
            </motion.div>

            <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    <Users className="size-3.5" />
                    Members ({members.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30">
                    {members.map((member) => {
                        const RIcon = roleIcons[member.role] || User
                        return (
                            <div key={member.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        {member.user.image ? (
                                            <img src={member.user.image} alt="" className="size-8 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-medium text-foreground">{member.user.name?.[0]?.toUpperCase() || "?"}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">{member.user.name || "Unnamed"}</p>
                                        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <RIcon className="size-3.5 text-muted-foreground" />
                                        {member.role === "owner" ? (
                                            <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
                                        ) : (
                                            <Select
                                                value={member.role}
                                                onValueChange={(val) => handleRoleChange(member.id, val)}
                                            >
                                                <SelectTrigger className="h-7 w-[90px] border-none bg-transparent text-xs shadow-none">
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
                                            className="text-muted-foreground transition-colors hover:text-red-500"
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
                            <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No members yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {invitations.filter((i) => i.status === "pending").length > 0 && (
                <div>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        <Mail className="size-3.5" />
                        Pending Invitations
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/30">
                        {invitations
                            .filter((i) => i.status === "pending")
                            .map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-foreground">{inv.email}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {inv.role}
                                            {inv.teamId ? ` · Team ${inv.teamId.slice(0, 8)}…` : ""}
                                            {" "}· Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCancelInvitation(inv.id)}
                                        className="text-xs text-muted-foreground transition-colors hover:text-red-500"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {teams.length > 0 && (
                <div>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        <UsersRound className="size-3.5" />
                        Available Teams ({teams.length})
                    </h2>
                    <div className="overflow-hidden rounded-xl border border-border/50 bg-card/30">
                        <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
                            {teams.map((team) => (
                                <div key={team.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
                                    {team.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
