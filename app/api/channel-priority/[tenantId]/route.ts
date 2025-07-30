import { NextRequest, NextResponse } from "next/server"

export const GET = async (request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) => {
  try {
    const { tenantId } = await params
    const authHeader = request.headers.get("authorization")
    const adminApiUrl = process.env.ADMIN_API_URL

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    if (!adminApiUrl) {
      return NextResponse.json({ error: "Admin API URL not configured" }, { status: 500 })
    }

    const token = authHeader.substring(7)
    const fullUrl = `${adminApiUrl}/api/getChannelPriority/${tenantId}`

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: "Authentication failed", shouldRedirect: true }, { status: 401 })
      }
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching channel priority:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
