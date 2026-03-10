"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { BookOpen, Loader2 } from "lucide-react"
import Link from "next/link"
import { getAuthErrorMessage } from "@/lib/auth-error"
import { setActiveOrganizationWithTeam } from "@/lib/organization-context"

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return

    if (!session) return // not logged in — show landing content

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
          router.replace("/onboarding")
        }
      } catch (err) {
        console.log(
          "Failed to resolve organization:",
          getAuthErrorMessage(err, "Could not load organization state."),
        )
        router.replace("/onboarding")
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

  // Authenticated users get redirected above — show this for unauthenticated
  if (session) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Auth UI Boilerplate</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto text-pretty">
          Next.js + Better Auth + Drizzle ORM + JWT/JWKS backend integration.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <BookOpen className="size-4" />
            Integration Guide
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
