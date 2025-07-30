import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GoogleAnalytics } from "@/components/google-analytics"
import { AnalyticsProvider } from "@/components/analytics-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CDP Console",
  description: "Customer Data Platform Console for managing user properties, data mappings, and more",
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}

export default RootLayout
