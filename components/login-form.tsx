"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, Lock } from "lucide-react"
import { hashPassword, setAuthState } from "@/lib/auth"

interface LoginFormProps {
  onLoginSuccess: () => void
}

export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Hash the password using SHA-256
      const hashedPassword = await hashPassword(password)
      console.log("Password hashed successfully")

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password: hashedPassword,
        }),
      })

      console.log("Response status:", response.status, response.statusText)

      const data = await response.json()
      console.log("Admin login response data:", data)

      if (response.ok) {
        // Fetch the core API token FIRST before storing anything
        let coreToken: string | undefined

        try {
          console.log("Fetching core API token...")
          const coreResponse = await fetch("/api/core-auth/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username,
              password: hashedPassword,
            }),
          })

          console.log("Core API response status:", coreResponse.status, coreResponse.statusText)

          if (coreResponse.ok) {
            const coreData = await coreResponse.json()
            console.log("Core API token FULL response:", coreData)
            console.log("Core API token response:", {
              hasAccessToken: !!coreData.access_token,
              tokenLength: coreData.access_token?.length,
              tokenPreview: coreData.access_token?.substring(0, 30) + "...",
              allKeys: Object.keys(coreData),
            })

            if (coreData.access_token) {
              coreToken = coreData.access_token
              console.log("✅ Got core access token")
            } else {
              console.error("❌ Core API response OK but no access_token field!", coreData)
            }
          } else {
            const errorText = await coreResponse.text()
            console.error("❌ Failed to fetch core API token:", {
              status: coreResponse.status,
              statusText: coreResponse.statusText,
              error: errorText,
            })
          }
        } catch (coreError) {
          console.error("❌ Exception fetching core token:", coreError)
        }

        // Now store BOTH tokens at once
        setAuthState(data.token, username, coreToken)
        console.log("✅ Stored auth state:", {
          hasAdminToken: !!data.token,
          hasCoreToken: !!coreToken,
          coreTokenLength: coreToken?.length,
        })

        onLoginSuccess()
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error details:", error)
      if (error instanceof Error) {
        setError(`Error: ${error.message}`)
      } else {
        setError("Network error. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">CDP Console Login</CardTitle>
          <p className="text-slate-600">Enter your credentials to access the admin panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}>
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading || !username || !password}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
