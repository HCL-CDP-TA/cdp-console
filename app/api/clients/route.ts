import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }
    const token = authHeader.substring(7)

    const response = await fetch(`${adminApiUrl}/api/getClientList`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching client list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
