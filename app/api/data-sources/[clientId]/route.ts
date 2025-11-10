import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const coreApiUrl = process.env.CORE_API_URL
    if (!coreApiUrl) {
      return NextResponse.json({ error: "Core API URL not configured" }, { status: 500 })
    }

    const token = authHeader.substring(7)
    console.log(`Fetching data sources for client ${clientId}`)

    // Fetch data sources from Core API
    const fullUrl = `${coreApiUrl}/-/v1/advertisers/${clientId}/sourceInstance`
    console.log(`Fetching from Core API: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log("Core API response:", JSON.stringify(data, null, 2))
      return NextResponse.json(data)
    } else if (response.status === 404) {
      // No data sources found - return empty data
      console.log("No data sources found for client:", clientId)
      return NextResponse.json({ data: [] })
    } else {
      const errorText = await response.text()
      console.error("Core API error:", response.status, errorText)

      // Return specific error for 401 to trigger re-authentication
      if (response.status === 401) {
        return NextResponse.json({ error: "Authentication failed", shouldReauth: true }, { status: 401 })
      }

      return NextResponse.json({ error: `Core API error: ${response.statusText}` }, { status: response.status })
    }
  } catch (error) {
    console.error("Error in Data Sources GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
