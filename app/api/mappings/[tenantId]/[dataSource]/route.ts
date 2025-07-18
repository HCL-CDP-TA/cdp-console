import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; dataSource: string }> },
) {
  try {
    const { dataSource, tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")

    console.log("Mappings API - Debug Info:", {
      tenantId,
      dataSource,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      apiEndpoint,
      timestamp: new Date().toISOString(),
    })

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const fullUrl = `${apiEndpoint}/api/mapping/tenant/VIZVRM${tenantId}/dataSource/${dataSource}`
    console.log("Making request to:", fullUrl)

    const response = await fetch(fullUrl, {
      headers: {
        authkey: apiKey,
        "Content-Type": "application/json",
      },
    })

    console.log("SST Mappings API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SST Mappings API Error:", errorText)
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
    console.log("SST Mappings API Success - Data length:", Array.isArray(data) ? data.length : "Not an array")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching mappings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; dataSource: string }> },
) {
  try {
    const { dataSource, tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")
    const body = await request.json()

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(`${apiEndpoint}/api/mapping`, {
      method: "POST",
      headers: {
        authkey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        TenantId: tenantId,
        DataSourceName: dataSource,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating mapping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
