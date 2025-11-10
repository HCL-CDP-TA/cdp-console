"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { validateAuthState } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const authResult = await validateAuthState()
      if (authResult.isValid) {
        // User is authenticated, redirect to user properties
        router.push("/user-properties")
      } else {
        setIsChecking(false)
      }
    }
    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <LoginForm
        onLoginSuccess={() => {
          router.push("/user-properties")
        }}
      />
    </div>
  )
}
