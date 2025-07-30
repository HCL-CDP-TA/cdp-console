import { NextRequest, NextResponse } from "next/server"

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userProperty: string }> },
) => {
  try {
    const { userProperty } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")
    const body = await request.json()

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(`${apiEndpoint}/api/userProperties`, {
      method: "PUT",
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
    console.error("Error updating user property:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userProperty: string }> },
) => {
  try {
    const { tenantId, userProperty } = await params
    const apiKey = request.headers.get("x-api-key")
    const apiEndpoint = request.headers.get("x-api-endpoint")

    if (!apiKey || !apiEndpoint) {
      return NextResponse.json({ error: "Missing API key or endpoint" }, { status: 400 })
    }

    const response = await fetch(
      `${apiEndpoint}/api/userProperties/tenantId/${tenantId}/userProperty/${userProperty}`,
      {
        method: "DELETE",
        headers: {
          authkey: apiKey,
        },
      },
    )

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText}`

      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError)
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user property:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
