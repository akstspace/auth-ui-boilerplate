"use client"

import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { LogIn, UserPlus, LogOut, Mail, User, Hash } from "lucide-react"
import { motion } from "motion/react"

export function AuthStatus() {
  const { data: session, isPending } = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.reload()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Authentication</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${isPending
              ? "bg-muted text-muted-foreground"
              : session
                ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
            }`}
        >
          <span className={`size-1.5 rounded-full ${isPending ? "bg-muted-foreground" : session ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"
            }`} />
          {isPending ? "Checking…" : session ? "Authenticated" : "Unauthenticated"}
        </span>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ) : session ? (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <User className="size-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{session.user.name}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">{session.user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Hash className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground font-mono text-xs tabular-nums">{session.user.id}</span>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full gap-2"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground mb-4">
            Sign in to test authenticated API calls and explore the JWT integration.
          </p>
          <Link href="/login" className="block">
            <Button className="w-full gap-2">
              <LogIn className="size-4" />
              Sign In
            </Button>
          </Link>
          <Link href="/signup" className="block">
            <Button variant="outline" className="w-full gap-2">
              <UserPlus className="size-4" />
              Create Account
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
