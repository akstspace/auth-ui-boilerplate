/**
 * API Test Component (Axios-based)
 *
 * An alternative demo component that uses the Axios-based API client
 * to test authenticated communication with your backend.
 *
 * If NEXT_PUBLIC_BACKEND_API_URL is not set, the component shows a
 * "not configured" message and disables the test button.
 */
"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { apiClientAxios } from "@/lib/api-client-axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Check if a backend API URL has been configured */
const isBackendConfigured = !!process.env.NEXT_PUBLIC_BACKEND_API_URL

export function APITestAxios() {
    const { data: session } = authClient.useSession()
    const [apiResponse, setApiResponse] = useState<string>("")
    const [apiLoading, setApiLoading] = useState(false)

    const testBackendAPI = async () => {
        setApiLoading(true)
        setApiResponse("")

        const response = await apiClientAxios.verifyAuth()

        if (response.error) {
            setApiResponse(`❌ Backend API Error (Axios): ${response.error}`)
        } else {
            setApiResponse(`✅ Backend API Success (Axios): ${JSON.stringify(response.data, null, 2)}`)
        }

        setApiLoading(false)
    }

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-white">Backend API Test (Axios)</CardTitle>
                <CardDescription className="text-zinc-400">
                    {isBackendConfigured
                        ? "Test authenticated requests using the Axios client"
                        : "No backend configured"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isBackendConfigured ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-center">
                        <p className="text-zinc-400 text-sm">
                            Set <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_BACKEND_API_URL</code> in your <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">.env</code> to enable backend testing.
                        </p>
                    </div>
                ) : (
                    <>
                        <Button
                            onClick={testBackendAPI}
                            disabled={!session || apiLoading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            {apiLoading ? "Testing..." : "Test Backend API (Axios)"}
                        </Button>

                        {!session && (
                            <p className="text-zinc-400 text-sm">
                                Sign in to test the backend API
                            </p>
                        )}

                        {apiResponse && (
                            <div className="p-4 bg-zinc-800 rounded-lg">
                                <h3 className="font-semibold text-white mb-2">API Response</h3>
                                <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                                    {apiResponse}
                                </pre>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
