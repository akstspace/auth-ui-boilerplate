"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, UsersRound } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { saveTeamPreference } from "@/lib/organization-context"

interface Team {
    id: string
    name: string
    organizationId: string
}

/**
 * Displays the user's active team in the navbar.
 *
 * - 0 teams  → renders nothing (avoids flash of empty UI)
 * - 1 team   → static label with icon (no dropdown needed)
 * - 2+ teams → dropdown switcher; saves selection to localStorage via
 *              saveTeamPreference so it is restored on the next org switch
 */
export function TeamSwitcher() {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const { data: session } = authClient.useSession()
    const [teams, setTeams] = useState<Team[]>([])
    const [open, setOpen] = useState(false)

    const sessionTeamId = session?.session?.activeTeamId ?? null

    // Optimistic: update immediately on select; sync from session on org switch.
    const [displayTeamId, setDisplayTeamId] = useState<string | null>(sessionTeamId)

    useEffect(() => {
        setDisplayTeamId(sessionTeamId)
    }, [sessionTeamId])

    // Re-fetch the user's team list whenever the active org changes.
    useEffect(() => {
        if (!activeOrg?.id) {
            setTeams([])
            return
        }

        const load = async () => {
            const { data, error } = await authClient.organization.listUserTeams()
            if (!error && Array.isArray(data)) {
                setTeams(data as Team[])
            } else {
                setTeams([])
            }
        }

        void load()
    }, [activeOrg?.id, sessionTeamId])

    const activeTeam =
        teams.find((t) => t.id === displayTeamId) ?? teams[0] ?? null

    const handleSelect = async (teamId: string) => {
        setOpen(false)
        if (teamId === displayTeamId || !activeOrg?.id) return

        // Optimistic update so the UI responds instantly.
        setDisplayTeamId(teamId)

        const { error } = await authClient.organization.setActiveTeam({ teamId })
        if (error) {
            // Revert on failure.
            setDisplayTeamId(sessionTeamId)
            return
        }
        saveTeamPreference(activeOrg.id, teamId)
    }

    if (teams.length === 0) return null

    const displayName = activeTeam?.name ?? "Team"

    // Single team → static label, no switcher needed.
    if (teams.length === 1) {
        return (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersRound className="size-4 shrink-0" />
                <span className="hidden max-w-24 truncate sm:inline">{displayName}</span>
            </div>
        )
    }

    // Multiple teams → dropdown switcher.
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <UsersRound className="size-4 shrink-0" />
                <span className="hidden max-w-24 truncate sm:inline">{displayName}</span>
                <ChevronDown className="size-3.5 shrink-0" />
            </button>

            {open && (
                <>
                    {/* Backdrop to close on outside-click */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                    <div className="absolute left-0 top-full z-50 mt-1.5 min-w-40 rounded-lg border border-border/60 bg-popover shadow-md">
                        <p
                            id="team-switcher-label"
                            className="px-4 pb-1 pt-1.5 text-xs font-medium text-muted-foreground"
                        >
                            Teams
                        </p>
                        <ul
                            role="listbox"
                            aria-labelledby="team-switcher-label"
                            className="px-2 pb-1.5"
                        >
                            {teams.map((t) => {
                                const isActive =
                                    t.id === (displayTeamId ?? teams[0]?.id)
                                return (
                                    <li
                                        key={t.id}
                                        role="option"
                                        aria-selected={isActive}
                                        onClick={() => void handleSelect(t.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault()
                                                void handleSelect(t.id)
                                            }
                                        }}
                                        tabIndex={0}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                                    >
                                        <span className="flex-1 truncate text-left text-foreground">
                                            {t.name}
                                        </span>
                                        {isActive && (
                                            <Check className="size-3.5 shrink-0 text-primary" />
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </>
            )}
        </div>
    )
}
