import { NextRequest, NextResponse } from "next/server"

export const GET = async (request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) => {
  try {
    const { tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")

    console.log("User Properties API - Debug Info:", {
      tenantId,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      apiEndpoint,
      timestamp: new Date().toISOString(),
    })

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const fullUrl = `${apiEndpoint}/api/userProperties/tenantId/${tenantId}`
    console.log("Making request to:", fullUrl)

    const response = await fetch(fullUrl, {
      headers: {
        authkey: apiKey,
        "Content-Type": "application/json",
      },
    })

    console.log("SST API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SST API Error:", errorText)
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
    console.log("SST API Success - Data length:", Array.isArray(data) ? data.length : "Not an array")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching user properties:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export const POST = async (request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) => {
  try {
    const { tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")
    const body = await request.json()

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(`${apiEndpoint}/api/userProperties`, {
      method: "POST",
      headers: {
        authkey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating user property:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
