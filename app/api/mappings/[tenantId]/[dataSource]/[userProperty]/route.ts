import { NextRequest, NextResponse } from "next/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; dataSource: string; userProperty: string }> },
) {
  try {
    const { dataSource, userProperty, tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")
    const body = await request.json()

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(
      `${apiEndpoint}/api/v1/tenants/${tenantId}/datasources/${dataSource}/properties/${userProperty}`,
      {
        method: "PUT",
        headers: {
          authkey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          TenantId: tenantId,
          DataSourceName: dataSource,
        }),
      },
    )

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating mapping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; dataSource: string; userProperty: string }> },
) {
  try {
    const { dataSource, userProperty, tenantId } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(
      `${apiEndpoint}/api/v1/tenants/${tenantId}/datasources/${dataSource}/properties/${userProperty}`,
      {
        method: "DELETE",
        headers: {
          authkey: apiKey,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting mapping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
