import { NextRequest, NextResponse } from "next/server"

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json()

    console.log("Core API Token Request - Received payload:", {
      username,
      passwordLength: password?.length,
      passwordPrefix: password?.substring(0, 8) + "...",
      hasUsername: !!username,
      hasPassword: !!password,
      timestamp: new Date().toISOString(),
    })

    if (!username || !password) {
      console.error("Core API Token Request - Missing credentials:", {
        hasUsername: !!username,
        hasPassword: !!password,
      })
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const coreApiUrl = process.env.CORE_API_URL
    if (!coreApiUrl) {
      console.error("Core API Token Request - Core API URL not configured")
      return NextResponse.json({ error: "Core API URL not configured" }, { status: 500 })
    }

    // Hardcoded client credentials as specified
    const clientId = "client_id"
    const clientSecret = "client_secret"

    // Create form data for OAuth2 token request
    const formData = new URLSearchParams()
    formData.append("username", username)
    formData.append("password", password) // Should already be SHA-256 encoded from frontend
    formData.append("grant_type", "password")
    formData.append("client_id", clientId)
    formData.append("client_secret", clientSecret)

    console.log("Core API Token Request - Sending to Core API:", {
      url: `${coreApiUrl}/oauth2/token`,
      username,
      passwordLength: password?.length,
      formDataKeys: Array.from(formData.keys()),
      formDataValues: {
        username: formData.get("username"),
        passwordLength: formData.get("password")?.length,
        grant_type: formData.get("grant_type"),
        client_id: formData.get("client_id"),
        client_secret: formData.get("client_secret"),
      },
      timestamp: new Date().toISOString(),
    })

    const response = await fetch(`${coreApiUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })

    const responseText = await response.text()
    console.log("Core API Token Response - Raw response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 200),
      timestamp: new Date().toISOString(),
    })

    if (!response.ok) {
      console.error("Core API Token Error - Failed response:", {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
        sentPayload: {
          username,
          passwordLength: password?.length,
          grant_type: "password",
          client_id: clientId,
          client_secret: clientSecret,
        },
      })
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    let data
    try {
      data = JSON.parse(responseText)
      console.log("Core API Token Success - Parsed response:", {
        hasAccessToken: !!data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        hasRefreshToken: !!data.refresh_token,
        uid: data.uid,
        additionalFields: Object.keys(data).filter(key => !["access_token", "refresh_token"].includes(key)),
      })
    } catch (parseError) {
      console.error("Core API Token Error - Failed to parse JSON response:", {
        parseError: parseError instanceof Error ? parseError.message : parseError,
        responseText,
      })
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("Core API token error - Exception caught:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
