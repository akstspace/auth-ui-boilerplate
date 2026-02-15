"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, ArrowLeft } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await authClient.signUp.email({ email, password, name })
      window.location.href = "/login"
    } catch {
      setError("Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <UserPlus className="size-4 text-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Enter your information to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-foreground mb-1.5 block">
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-muted/50 border-border/50 focus:border-foreground/30"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/50 focus:border-foreground/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-foreground mb-1.5 block">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-muted/50 border-border/50 focus:border-foreground/30"
            />
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-500 dark:text-red-400 text-center py-1">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}