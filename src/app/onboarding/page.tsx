"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2 } from "lucide-react"

export default function OnboardingPage() {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
            const { data, error: err } = await authClient.organization.create({ name, slug })
            if (err) {
                setError(err.message || "Failed to create organization.")
                return
            }
            if (data) {
                await authClient.organization.setActive({ organizationId: data.id })
                router.replace(`/org/${data.id}`)
            }
        } catch {
            setError("An unexpected error occurred.")
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
                <div className="mb-8">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                            <Building2 className="size-4 text-foreground" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-balance">Create your organization</h1>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                        Set up your first organization to get started.
                    </p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label htmlFor="orgName" className="text-sm font-medium text-foreground mb-1.5 block">
                            Organization name
                        </label>
                        <Input
                            id="orgName"
                            type="text"
                            placeholder="My Company"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            className="bg-muted/50 border-border/50 focus:border-foreground/30"
                        />
                    </div>

                    {error && (
                        <div role="alert" className="text-sm text-red-500 dark:text-red-400 text-center py-1">
                            {error}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Creating…" : "Continue"}
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}
