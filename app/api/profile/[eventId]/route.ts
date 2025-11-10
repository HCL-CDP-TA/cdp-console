import { NextRequest, NextResponse } from "next/server"

export const GET = async (request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  const { eventId } = await params

  try {
    // Get tenant configuration from headers
    const clientId = request.headers.get("x-client-id")
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")

    if (!clientId || !apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing required tenant configuration" }, { status: 400 })
    }

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
    }

    // Build the SST API URL
    const url = new URL(`${apiEndpoint}/api/v1/getProfileAndSegments`)
    url.searchParams.set("campaign", `VIZVRM${clientId}`)
    url.searchParams.set("key", eventId)
    url.searchParams.set("lock_type", "none")
    url.searchParams.set("auth_key", apiKey)
    url.searchParams.set("lookup", "multi")

    console.log("Fetching profile from SST API:", url.toString())

    // Call the SST API
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SST API error:", response.status, errorText)
      return NextResponse.json(
        { error: `SST API error: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch profile data" }, { status: 500 })
  }
}
