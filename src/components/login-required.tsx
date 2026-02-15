"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import authClient from "@/lib/auth-client"

/**
 * Wraps a page so that unauthenticated users are redirected to /login.
 * Shows nothing while the session is loading; renders children once
 * an authenticated session is confirmed.
 */
export function LoginRequired({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.replace("/login")
        }
    }, [isPending, session, router])

    if (isPending || !session?.user) {
        return null
    }

    return <>{children}</>
}
