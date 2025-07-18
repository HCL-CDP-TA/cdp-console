import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const apiUrl = process.env.ADMIN_API_URL
    if (!apiUrl) {
      return NextResponse.json({ error: "Admin API URL not configured" }, { status: 500 })
    }

    const response = await fetch(`${apiUrl}/api/userLogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password, // Password should already be SHA-256 encoded from frontend
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
