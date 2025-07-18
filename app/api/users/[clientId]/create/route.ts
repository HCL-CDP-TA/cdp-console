import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const authHeader = request.headers.get("authorization")
    const { userName, recipientEmail } = await request.json()

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    if (!userName || !recipientEmail) {
      return NextResponse.json({ error: "Username and recipient email are required" }, { status: 400 })
    }

    const token = authHeader.substring(7)
    const apiUrl = process.env.ADMIN_API_URL

    if (!apiUrl) {
      return NextResponse.json({ error: "Admin API URL not configured" }, { status: 500 })
    }

    // Create FormData as required by the API
    const formData = new FormData()
    formData.append("campaignId", clientId)
    formData.append("userName", userName)
    formData.append("recipientEmail", recipientEmail)
    formData.append("userEmail", "cdp-admin@hcl.software")
    formData.append("config", "undefined")
    formData.append("userLevel", "0")

    const response = await fetch(`${apiUrl}/api/createUser`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
