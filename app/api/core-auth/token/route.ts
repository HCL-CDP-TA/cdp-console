import { NextRequest, NextResponse } from "next/server"
import { getTenantCoreApiToken, isTenantCoreApiConfigured } from "@/lib/core-api-token"

export const POST = async (request: NextRequest) => {
  try {
    const { tenantId } = await request.json()

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 })
    }

    if (!isTenantCoreApiConfigured(tenantId)) {
      return NextResponse.json(
        { error: "Core API not configured for this tenant" },
        { status: 403 },
      )
    }

    const token = await getTenantCoreApiToken(tenantId)
    if (!token) {
      return NextResponse.json({ error: "Service account authentication failed" }, { status: 401 })
    }

    return NextResponse.json({ access_token: token })
  } catch (error) {
    console.error("Core API token error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
