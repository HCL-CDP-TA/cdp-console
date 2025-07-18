import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields: firstName, lastName, email" }, { status: 400 })
    }

    // Construct the admin API URL with the required parameters
    const encodedFirstName = encodeURIComponent(firstName)
    const encodedLastName = encodeURIComponent(lastName)
    const encodedUsername = encodeURIComponent(email)
    const adminApiBaseUrl = process.env.ADMIN_API_URL
    const adminApiUrl = `${adminApiBaseUrl}/api/updateUserName/${encodedFirstName}/${encodedLastName}/${encodedUsername}/cdp-admin@hcl.software`

    const response = await fetch(adminApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()

    // Validate that exactly 1 row was updated
    if (data.affectedRows !== 1 || data.changedRows !== 1) {
      return NextResponse.json(
        {
          error: "Update validation failed",
          details: `Expected 1 row to be changed, got ${data.changedRows}`,
          data,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully",
      data,
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
