"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { UserPropertiesManager } from "@/components/user-properties-manager"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCog } from "lucide-react"
import { Tenant } from "@/types/tenant"
import { clearAuthState } from "@/lib/auth"

export default function UserPropertiesPage() {
  const router = useRouter()
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  useEffect(() => {
    const savedTenantId = localStorage.getItem("selectedTenantId")
    if (savedTenantId) {
      const savedTenant = JSON.parse(localStorage.getItem(`tenant-${savedTenantId}`) || "{}")
      if (savedTenant.id) {
        setSelectedTenant(savedTenant)
      }
    }
  }, [])

  const handleBackToTenantSelector = () => {
    router.push("/tenants")
  }

  const handleAuthExpired = () => {
    console.log("Auth expired on user properties page - clearing state and redirecting")
    clearAuthState()
    router.push("/login")
  }

  return (
    <AppLayout>
      <div className="p-6">
        {selectedTenant ? (
          <UserPropertiesManager tenant={selectedTenant} onAuthExpired={handleAuthExpired} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <UserCog className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tenant Selected</h3>
              <p className="text-slate-600 mb-4">Please select a tenant to manage user properties</p>
              <Button onClick={handleBackToTenantSelector}>Select Tenant</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
