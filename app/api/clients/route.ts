import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const adminApiUrl = process.env.ADMIN_API_URL

    console.log("Clients API - Debug Info:", {
      hasAuthHeader: !!authHeader,
      adminApiUrl,
      timestamp: new Date().toISOString(),
    })

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    if (!adminApiUrl) {
      return NextResponse.json({ error: "Admin API URL not configured" }, { status: 500 })
    }

    const token = authHeader.substring(7)
    const fullUrl = `${adminApiUrl}/api/getClientList`

    console.log("Making request to:", fullUrl)

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Admin API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Admin API Error:", errorText)
      return NextResponse.json(
        {
          error: `API request failed: ${response.statusText}`,
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Admin API Success - Data length:", Array.isArray(data) ? data.length : "Not an array")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching client list:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
