"use client"

import { useRouter } from "next/navigation"
import AppLayout from "@/components/app-layout"
import { TenantManager } from "@/components/tenant-manager"
import { Tenant } from "@/types/tenant"

export default function TenantsPage() {
  const router = useRouter()

  const handleTenantSelected = (tenant: Tenant) => {
    localStorage.setItem("selectedTenantId", tenant.id)
    localStorage.setItem(`tenant-${tenant.id}`, JSON.stringify(tenant))
    router.push("/user-properties")
  }

  return (
    <AppLayout>
      <div className="p-6">
        <TenantManager onTenantSelected={handleTenantSelected} />
      </div>
    </AppLayout>
  )
}
