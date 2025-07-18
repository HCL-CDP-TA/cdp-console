import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const body = await request.json()
    const { username, emailAddress } = body

    if (!username || !emailAddress) {
      return NextResponse.json({ error: "Missing required fields: username, emailAddress" }, { status: 400 })
    }

    // Construct the admin API URL with the required parameters
    const encodedUsername = encodeURIComponent(username)
    const encodedEmailAddress = encodeURIComponent(emailAddress)
    const adminApiBaseUrl = process.env.ADMIN_API_URL
    const adminApiUrl = `${adminApiBaseUrl}/api/resetPassword/${encodedUsername}/${encodedEmailAddress}/cdp-admin@hcl.software`

    const response = await fetch(adminApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Password reset request failed: ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      message: "Password reset email sent successfully",
      data,
    })
  } catch (error) {
    console.error("Error processing password reset request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
