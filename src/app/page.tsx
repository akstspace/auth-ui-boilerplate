"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { setActiveOrganizationWithTeam } from "@/lib/organization-context"
import { isPlatformAdmin } from "@/lib/platform-admin"

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return

    if (!session) {
      router.replace("/login")
      return
    }

    // Check for active org in session
    const activeOrgId = (session.session as Record<string, unknown>).activeOrganizationId as string | undefined
    if (activeOrgId) {
      router.replace("/org")
      return
    }

    // No active org — try to get user's orgs and pick the first one
    const findOrg = async () => {
      try {
        const { data } = await authClient.organization.list()
        if (data && data.length > 0) {
          const { error: activationError } = await setActiveOrganizationWithTeam(data[0].id)
          if (activationError) {
            console.error(
              "Failed to activate organization:",
              getAuthErrorMessage(activationError, "Could not activate organization."),
            )
            router.replace("/onboarding")
            return
          }
          router.replace("/org")
        } else {
          router.replace(isPlatformAdmin(session.user.role) ? "/admin" : "/onboarding")
        }
      } catch (err) {
        console.error(
          "Failed to resolve organization:",
          getAuthErrorMessage(err, "Could not load organization state."),
        )
        router.replace(isPlatformAdmin(session.user.role) ? "/admin" : "/onboarding")
      }
    }

    findOrg()
  }, [session, isPending, router])

  // Loading state
  if (isPending) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
