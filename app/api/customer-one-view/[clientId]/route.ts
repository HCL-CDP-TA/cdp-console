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
    console.log(`Fetching Customer One View mappings for client ${clientId}`)

    // Fetch Customer One View data from Core API
    const fullUrl = `${coreApiUrl}/-/v1/advertisers/${clientId}/CustomerOneViewSettingsAdd`
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
      console.log("Response structure check:", {
        hasData: !!data.data,
        isDataArray: Array.isArray(data.data),
        dataLength: data.data?.length,
        hasDataPointMapping: !!data.DataPointMapping,
        firstItemKeys: data.data?.[0] ? Object.keys(data.data[0]) : null,
      })
      return NextResponse.json(data)
    } else if (response.status === 404) {
      // No Customer One View data found - return empty data
      console.log("No Customer One View data found for client:", clientId)
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
    console.error("Error in Customer One View GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
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
    const body = await request.json()
    console.log(`Saving Customer One View mappings for client ${clientId}:`, JSON.stringify(body, null, 2))

    // The payload is already in the correct format from the component
    // No transformation needed - pass it directly to Core API
    console.log("Payload for Core API:", JSON.stringify(body, null, 2))

    // Send to Core API
    const fullUrl = `${coreApiUrl}/-/v1/advertisers/${clientId}/CustomerOneViewSettingsAdd`
    console.log(`Posting to Core API: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const result = await response.json()
      console.log("Core API save successful:", result)
      return NextResponse.json({ success: true, data: result })
    } else {
      const errorText = await response.text()
      console.error("Core API save error:", response.status, errorText)

      // Return specific error for 401 to trigger re-authentication
      if (response.status === 401) {
        return NextResponse.json({ error: "Authentication failed", shouldReauth: true }, { status: 401 })
      }

      return NextResponse.json({ error: `Core API error: ${response.statusText}` }, { status: response.status })
    }
  } catch (error) {
    console.error("Error in Customer One View POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
