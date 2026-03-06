"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Check,
    Loader2,
    Pencil,
    Plus,
    RefreshCcw,
    Trash2,
    UserPlus,
    UsersRound,
    X,
} from "lucide-react"

interface Team {
    id: string
    name: string
    organizationId: string
}

interface Member {
    id: string
    userId: string
    role: string
    user: {
        name: string
        email: string
    }
}

interface TeamMember {
    id: string
    teamId: string
    userId: string
    createdAt: string | Date
}

interface TeamMemberLoadError {
    message: string
    code?: string
}

const EMPTY_MEMBER = "__member__"
const TEAM_MEMBER_PERMISSION_ERROR = "USER_IS_NOT_A_MEMBER_OF_THE_TEAM"

const isOrgManagerRole = (role: string | undefined) => {
    if (!role) return false
    return role
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === "owner" || value === "admin")
}

const parseMembers = (value: unknown): Member[] => {
    if (Array.isArray(value)) return value as Member[]

    if (
        value &&
        typeof value === "object" &&
        "members" in value &&
        Array.isArray((value as { members?: unknown }).members)
    ) {
        return (value as { members: Member[] }).members
    }

    return []
}

const getInitials = (nameOrEmail: string) => {
    const parts = nameOrEmail.trim().split(/\s+/)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

const formatJoinedDate = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown"

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [teamMembersByTeam, setTeamMembersByTeam] = useState<Record<string, TeamMember[]>>({})
    const [teamMemberErrorsByTeam, setTeamMemberErrorsByTeam] = useState<Record<string, TeamMemberLoadError>>({})
    const [teamMembersLoadingFor, setTeamMembersLoadingFor] = useState<string | null>(null)

    const [creating, setCreating] = useState(false)
    const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null)
    const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
    const [assigning, setAssigning] = useState(false)
    const [removingMemberKey, setRemovingMemberKey] = useState<string | null>(null)

    const [newTeamName, setNewTeamName] = useState("")
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
    const [editTeamName, setEditTeamName] = useState("")
    const [selectedUserId, setSelectedUserId] = useState(EMPTY_MEMBER)

    const [teamError, setTeamError] = useState("")
    const [teamSuccess, setTeamSuccess] = useState("")
    const [membershipError, setMembershipError] = useState("")
    const [membershipSuccess, setMembershipSuccess] = useState("")

    const { data: activeMemberRole, isPending: roleLoading } = authClient.useActiveMemberRole()
    const { data: session } = authClient.useSession()

    const canManageOrg = isOrgManagerRole(activeMemberRole?.role)

    const memberDirectory = useMemo(
        () => new Map(members.map((member) => [member.userId, member])),
        [members],
    )

    const selectedTeam = useMemo(
        () => teams.find((team) => team.id === selectedTeamId) ?? null,
        [selectedTeamId, teams],
    )

    const selectedTeamMembers = selectedTeamId
        ? (teamMembersByTeam[selectedTeamId] ?? [])
        : []

    const selectedTeamLoadError = selectedTeamId
        ? teamMemberErrorsByTeam[selectedTeamId]
        : undefined

    const selectedTeamIsLoading = Boolean(
        selectedTeamId && teamMembersLoadingFor === selectedTeamId,
    )

    const availableMembersForSelectedTeam = useMemo(() => {
        if (!selectedTeamId) return []

        const assignedUserIds = new Set(
            (teamMembersByTeam[selectedTeamId] ?? []).map((member) => member.userId),
        )

        return members.filter((member) => !assignedUserIds.has(member.userId))
    }, [members, selectedTeamId, teamMembersByTeam])

    const fetchBaseData = useCallback(async () => {
        try {
            const [teamsRes, membersRes] = await Promise.all([
                authClient.organization.listTeams(),
                authClient.organization.listMembers(),
            ])

            if (teamsRes.error) {
                setTeamError(getAuthErrorMessage(teamsRes.error, "Failed to load teams."))
                return
            }

            if (membersRes.error) {
                setMembershipError(
                    getAuthErrorMessage(
                        membersRes.error,
                        "Failed to load organization members.",
                    ),
                )
                return
            }

            const nextTeams = (Array.isArray(teamsRes.data) ? teamsRes.data : []) as Team[]
            const nextMembers = parseMembers(membersRes.data)

            setTeams(nextTeams)
            setMembers(nextMembers)

            setSelectedTeamId((current) => {
                if (nextTeams.length === 0) return null
                if (current && nextTeams.some((team) => team.id === current)) return current
                return nextTeams[0].id
            })

            const validTeamIds = new Set(nextTeams.map((team) => team.id))

            setTeamMembersByTeam((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([teamId]) => validTeamIds.has(teamId)),
                ),
            )

            setTeamMemberErrorsByTeam((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([teamId]) => validTeamIds.has(teamId)),
                ),
            )
        } catch (err) {
            setTeamError(getAuthErrorMessage(err, "Failed to load teams."))
        } finally {
            setLoading(false)
        }
    }, [])

    const loadTeamMembers = useCallback(async (teamId: string) => {
        setTeamMembersLoadingFor(teamId)

        try {
            const { data, error } = await authClient.organization.listTeamMembers({
                query: { teamId },
            })

            if (error) {
                const errorCode =
                    typeof error === "object" && error && "code" in error
                        ? String((error as { code?: string }).code)
                        : undefined

                setTeamMemberErrorsByTeam((current) => ({
                    ...current,
                    [teamId]: {
                        message: getAuthErrorMessage(error, "Failed to load team members."),
                        code: errorCode,
                    },
                }))
                setTeamMembersByTeam((current) => ({ ...current, [teamId]: [] }))
                return
            }

            setTeamMembersByTeam((current) => ({
                ...current,
                [teamId]: (Array.isArray(data) ? data : []) as TeamMember[],
            }))

            setTeamMemberErrorsByTeam((current) => {
                if (!current[teamId]) return current
                const next = { ...current }
                delete next[teamId]
                return next
            })
        } catch (err) {
            setTeamMemberErrorsByTeam((current) => ({
                ...current,
                [teamId]: {
                    message: getAuthErrorMessage(err, "Failed to load team members."),
                },
            }))
            setTeamMembersByTeam((current) => ({ ...current, [teamId]: [] }))
        } finally {
            setTeamMembersLoadingFor((current) => (current === teamId ? null : current))
        }
    }, [])

    useEffect(() => {
        if (roleLoading) return
        if (!canManageOrg) {
            setLoading(false)
            return
        }

        void fetchBaseData()
    }, [canManageOrg, fetchBaseData, roleLoading])

    useEffect(() => {
        if (!selectedTeamId) return
        void loadTeamMembers(selectedTeamId)
    }, [loadTeamMembers, selectedTeamId])

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTeamName.trim()) return

        const nextName = newTeamName.trim()
        setCreating(true)
        setTeamError("")
        setTeamSuccess("")

        try {
            const { data, error } = await authClient.organization.createTeam({
                name: nextName,
            })

            if (error) {
                setTeamError(getAuthErrorMessage(error, "Failed to create team."))
                return
            }

            const createdTeamId =
                data && typeof data === "object" && "id" in data
                    ? String((data as { id: string }).id)
                    : ""

            if (createdTeamId && session?.user?.id) {
                try {
                    await authClient.organization.addTeamMember({
                        teamId: createdTeamId,
                        userId: session.user.id,
                    })
                } catch (addMemberError) {
                    console.error(
                        `Failed to add creator (userId=${session.user.id}) to team (teamId=${createdTeamId}):`,
                        addMemberError,
                    )
                    setTeamError(
                        getAuthErrorMessage(addMemberError, "Team created but failed to add you as a member."),
                    )
                }
            }

            setNewTeamName("")
            setTeamSuccess(`Created team "${nextName}".`)
            await fetchBaseData()

            if (createdTeamId) {
                setSelectedTeamId(createdTeamId)
                await loadTeamMembers(createdTeamId)
            }
        } catch (err) {
            setTeamError(getAuthErrorMessage(err, "Failed to create team."))
        } finally {
            setCreating(false)
        }
    }

    const handleSaveTeamName = async (teamId: string) => {
        const nextName = editTeamName.trim()
        if (!nextName) return

        setUpdatingTeamId(teamId)
        setTeamError("")
        setTeamSuccess("")

        try {
            const { error } = await authClient.organization.updateTeam({
                teamId,
                data: { name: nextName },
            })

            if (error) {
                setTeamError(getAuthErrorMessage(error, "Failed to rename team."))
                return
            }

            setEditingTeamId(null)
            setEditTeamName("")
            setTeamSuccess("Team renamed.")
            await fetchBaseData()
        } catch (err) {
            setTeamError(getAuthErrorMessage(err, "Failed to rename team."))
        } finally {
            setUpdatingTeamId(null)
        }
    }

    const handleDeleteTeam = async (teamId: string, teamName: string) => {
        const confirmed = window.confirm(`Delete team \"${teamName}\"? This cannot be undone.`)
        if (!confirmed) return

        setDeletingTeamId(teamId)
        setTeamError("")
        setTeamSuccess("")

        try {
            const { error } = await authClient.organization.removeTeam({ teamId })

            if (error) {
                setTeamError(getAuthErrorMessage(error, "Failed to delete team."))
                return
            }

            setTeamSuccess(`Deleted team "${teamName}".`)
            await fetchBaseData()
        } catch (err) {
            setTeamError(getAuthErrorMessage(err, "Failed to delete team."))
        } finally {
            setDeletingTeamId(null)
        }
    }

    const handleAddMemberToSelectedTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeamId || selectedUserId === EMPTY_MEMBER) return

        setAssigning(true)
        setMembershipError("")
        setMembershipSuccess("")

        try {
            const { error } = await authClient.organization.addTeamMember({
                teamId: selectedTeamId,
                userId: selectedUserId,
            })

            if (error) {
                setMembershipError(getAuthErrorMessage(error, "Failed to add member to team."))
                return
            }

            const addedMember = memberDirectory.get(selectedUserId)
            setMembershipSuccess(
                `Added ${addedMember?.user.name || addedMember?.user.email || "member"} to ${selectedTeam?.name || "team"}.`,
            )
            setSelectedUserId(EMPTY_MEMBER)
            await loadTeamMembers(selectedTeamId)
        } catch (err) {
            setMembershipError(getAuthErrorMessage(err, "Failed to add member to team."))
        } finally {
            setAssigning(false)
        }
    }

    const handleRemoveMemberFromSelectedTeam = async (userId: string) => {
        if (!selectedTeamId) return

        const actionKey = `${selectedTeamId}:${userId}`
        setRemovingMemberKey(actionKey)
        setMembershipError("")
        setMembershipSuccess("")

        try {
            const { error } = await authClient.organization.removeTeamMember({
                teamId: selectedTeamId,
                userId,
            })

            if (error) {
                setMembershipError(getAuthErrorMessage(error, "Failed to remove member from team."))
                return
            }

            const removedMember = memberDirectory.get(userId)
            setMembershipSuccess(
                `Removed ${removedMember?.user.name || removedMember?.user.email || "member"} from ${selectedTeam?.name || "team"}.`,
            )
            await loadTeamMembers(selectedTeamId)
        } catch (err) {
            setMembershipError(getAuthErrorMessage(err, "Failed to remove member from team."))
        } finally {
            setRemovingMemberKey(null)
        }
    }

    const handleJoinSelectedTeam = async () => {
        if (!selectedTeamId || !session?.user?.id) return

        setMembershipError("")
        setMembershipSuccess("")

        try {
            const { error } = await authClient.organization.addTeamMember({
                teamId: selectedTeamId,
                userId: session.user.id,
            })

            if (error) {
                setMembershipError(
                    getAuthErrorMessage(
                        error,
                        "Failed to join this team. Ask an owner/admin to add you.",
                    ),
                )
                return
            }

            setMembershipSuccess(`You were added to ${selectedTeam?.name || "this team"}.`)
            await loadTeamMembers(selectedTeamId)
        } catch (err) {
            setMembershipError(getAuthErrorMessage(err, "Failed to join this team."))
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
                <h1 className="text-xl font-bold text-foreground">Teams</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Only organization owners and admins can create teams and manage memberships.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <UsersRound className="size-5" />
                    Teams
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Create focused teams and manage who belongs where.
                </p>
            </div>

            {/* Teams section */}
            <div className="border border-border/50 rounded-lg bg-card text-card-foreground">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <div>
                        <p className="text-sm font-semibold text-foreground">All Teams</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {teams.length === 0
                                ? "No teams yet."
                                : `${teams.length} team${teams.length === 1 ? "" : "s"}`}
                        </p>
                    </div>
                    <form onSubmit={handleCreateTeam} className="flex gap-2">
                        <Input
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="e.g. Engineering"
                            className="h-8 w-44 bg-background text-sm"
                            required
                        />
                        <Button type="submit" size="sm" disabled={creating}>
                            {creating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="mr-1 size-3.5" />
                                    Create
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                {teamError && (
                    <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {teamError}
                    </div>
                )}
                {teamSuccess && (
                    <div className="mx-6 mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
                        {teamSuccess}
                    </div>
                )}

                {teams.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No teams yet. Use the form above to create your first team.
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {teams.map((team) => {
                            const isSelected = selectedTeamId === team.id
                            const isEditing = editingTeamId === team.id
                            const cachedMemberCount = teamMembersByTeam[team.id]?.length

                            return (
                                <div
                                    key={team.id}
                                    className={cn(
                                        "flex items-center gap-3 px-6 py-3.5 transition-colors",
                                        isSelected ? "bg-muted/50" : "hover:bg-muted/30",
                                    )}
                                >
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                                        {getInitials(team.name)}
                                    </div>

                                    {isEditing ? (
                                        <div className="flex flex-1 items-center gap-2">
                                            <Input
                                                value={editTeamName}
                                                onChange={(e) => setEditTeamName(e.target.value)}
                                                className="h-7 bg-background text-sm"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleSaveTeamName(team.id)}
                                                className="text-emerald-600 transition-colors hover:text-emerald-500"
                                                aria-label="Save team name"
                                                title="Save team name"
                                                disabled={updatingTeamId === team.id}
                                            >
                                                {updatingTeamId === team.id ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <Check className="size-4" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingTeamId(null)
                                                    setEditTeamName("")
                                                }}
                                                className="text-muted-foreground transition-colors hover:text-foreground"
                                                aria-label="Cancel rename"
                                                title="Cancel rename"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTeamId(team.id)}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <p className="truncate text-sm font-medium text-foreground">{team.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {typeof cachedMemberCount === "number"
                                                        ? `${cachedMemberCount} member${cachedMemberCount === 1 ? "" : "s"}`
                                                        : "Click to load members"}
                                                </p>
                                            </button>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {isSelected && (
                                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                        Selected
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingTeamId(team.id)
                                                        setEditTeamName(team.name)
                                                    }}
                                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                                    aria-label="Rename team"
                                                    title="Rename team"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteTeam(team.id, team.name)}
                                                    className="text-muted-foreground transition-colors hover:text-destructive"
                                                    aria-label="Delete team"
                                                    title="Delete team"
                                                    disabled={deletingTeamId === team.id}
                                                >
                                                    {deletingTeamId === team.id ? (
                                                        <Loader2 className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="size-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Selected team members section */}
            <div className="border border-border/50 rounded-lg bg-card text-card-foreground">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {selectedTeam ? selectedTeam.name : "Team Members"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedTeam
                                ? `${selectedTeamMembers.length} member${selectedTeamMembers.length === 1 ? "" : "s"}`
                                : "Select a team above to manage its members."}
                        </p>
                    </div>
                    {selectedTeam && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void loadTeamMembers(selectedTeam.id)}
                            disabled={selectedTeamIsLoading}
                        >
                            {selectedTeamIsLoading ? (
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            ) : (
                                <RefreshCcw className="mr-1.5 size-3.5" />
                            )}
                            Refresh
                        </Button>
                    )}
                </div>

                {!selectedTeam ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No team selected. Click a team above to manage its members.
                    </div>
                ) : (
                    <>
                        {/* Add member */}
                        <div className="px-6 py-4 border-b border-border/50">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                                Add Member
                            </p>
                            <form
                                onSubmit={handleAddMemberToSelectedTeam}
                                className="flex gap-2"
                            >
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="bg-background flex-1">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={EMPTY_MEMBER}>Select member</SelectItem>
                                        {availableMembersForSelectedTeam.map((member) => (
                                            <SelectItem key={member.userId} value={member.userId}>
                                                {member.user.name || member.user.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    type="submit"
                                    disabled={
                                        assigning ||
                                        selectedUserId === EMPTY_MEMBER ||
                                        availableMembersForSelectedTeam.length === 0
                                    }
                                >
                                    {assigning ? (
                                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="mr-1.5 size-4" />
                                    )}
                                    Add Member
                                </Button>
                            </form>
                            {availableMembersForSelectedTeam.length === 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    All organization members are already in this team.
                                </p>
                            )}
                        </div>

                        {membershipError && (
                            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                {membershipError}
                            </div>
                        )}
                        {membershipSuccess && (
                            <div className="mx-6 mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
                                {membershipSuccess}
                            </div>
                        )}

                        {/* Member list */}
                        {selectedTeamIsLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedTeamLoadError ? (
                            <div className="space-y-3 px-6 py-4">
                                <p className="text-sm text-destructive">
                                    {selectedTeamLoadError.message}
                                </p>
                                {selectedTeamLoadError.code === TEAM_MEMBER_PERMISSION_ERROR &&
                                    session?.user?.id && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleJoinSelectedTeam()}
                                        >
                                            Join Team to View Members
                                        </Button>
                                    )}
                            </div>
                        ) : selectedTeamMembers.length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                                This team has no members yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {selectedTeamMembers.map((teamMember) => {
                                    const orgMember = memberDirectory.get(teamMember.userId)
                                    const name = orgMember?.user.name || orgMember?.user.email || teamMember.userId
                                    const email = orgMember?.user.email || teamMember.userId
                                    const role = orgMember?.role || "member"
                                    const removeActionKey = `${teamMember.teamId}:${teamMember.userId}`

                                    return (
                                        <div
                                            key={teamMember.id}
                                            className="flex items-center gap-3 px-6 py-3.5"
                                        >
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                                                {getInitials(name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {email} · {role} · added {formatJoinedDate(teamMember.createdAt)}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    void handleRemoveMemberFromSelectedTeam(teamMember.userId)
                                                }
                                                disabled={removingMemberKey === removeActionKey}
                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                {removingMemberKey === removeActionKey ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="size-4" />
                                                )}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
