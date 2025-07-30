import { NextRequest, NextResponse } from "next/server"

export const PUT = async (request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) => {
  try {
    const { clientId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const body = await request.json()
    const { username, isActive } = body

    if (!username || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing required fields: username, isActive" }, { status: 400 })
    }

    // Construct the admin API URL with the required parameters
    const encodedUsername = encodeURIComponent(username)
    const status = isActive.toString()
    const adminApiBaseUrl = process.env.ADMIN_API_URL
    const adminApiUrl = `${adminApiBaseUrl}/api/updateUserStatus/${status}/${encodedUsername}`

    const response = await fetch(adminApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `User status update failed: ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data,
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
