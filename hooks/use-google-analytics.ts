"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { pageview } from "@/lib/analytics"

export const useGoogleAnalytics = () => {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      pageview(window.location.origin + pathname)
    }
  }, [pathname])
}
