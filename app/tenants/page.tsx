"use client"

import AppLayout from "@/components/app-layout"
import { TenantManager } from "@/components/tenant-manager"

export default function TenantsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <TenantManager />
      </div>
    </AppLayout>
  )
}
