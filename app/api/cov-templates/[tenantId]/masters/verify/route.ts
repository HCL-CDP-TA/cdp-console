import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const password = request.headers.get("x-master-password")
  if (!password || password !== process.env.MASTER_TEMPLATE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
