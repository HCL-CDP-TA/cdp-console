import { NextRequest, NextResponse } from "next/server"

export const GET = async (request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) => {
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
    const fullUrl = `${coreApiUrl}/-/v1/advertisers/${clientId}/cdpOfflineDataSource`

    console.log("Offline Data Sources API Request:", {
      clientId,
      url: fullUrl,
      hasToken: !!token,
      timestamp: new Date().toISOString(),
    })

    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Core API Offline Data Sources Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Core API Offline Data Sources Error:", errorText)

      // Return specific error for 401 to trigger re-authentication
      if (response.status === 401) {
        return NextResponse.json({ error: "Authentication failed", shouldReauth: true }, { status: 401 })
      }

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
    console.log("Core API Offline Data Sources Success - Data sources:", data?.data?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching offline data sources:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
