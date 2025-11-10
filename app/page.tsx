"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { validateAuthState } from "@/lib/auth"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const authResult = await validateAuthState()
      if (authResult.isValid) {
        router.push("/user-properties")
      } else {
        router.push("/login")
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  )
}
