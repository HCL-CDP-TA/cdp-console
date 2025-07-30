"use client"

import { useGoogleAnalytics } from "@/hooks/use-google-analytics"

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  useGoogleAnalytics()
  return <>{children}</>
}
