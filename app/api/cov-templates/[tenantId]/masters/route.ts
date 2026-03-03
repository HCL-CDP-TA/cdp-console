import { NextRequest, NextResponse } from "next/server"
import { readMasterTemplatesFile, writeMasterTemplatesFile, CovTemplate } from "@/lib/cov-templates"

function verifyPassword(request: NextRequest): boolean {
  const password = request.headers.get("x-master-password")
  return !!password && password === process.env.MASTER_TEMPLATE_PASSWORD
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const { tenantId } = await params
    const data = await readMasterTemplatesFile()
    const templates = data[tenantId] || []
    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error reading master templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!verifyPassword(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { tenantId } = await params
    const body = await request.json()
    const { name, mappings, description } = body

    if (!name || !Array.isArray(mappings)) {
      return NextResponse.json({ error: "Missing required fields: name, mappings" }, { status: 400 })
    }

    const data = await readMasterTemplatesFile()
    if (!data[tenantId]) {
      data[tenantId] = []
    }

    const template: CovTemplate = {
      name,
      mappings,
      createdAt: new Date().toISOString(),
      type: "master",
      ...(description ? { description } : {}),
    }

    const existingIndex = data[tenantId].findIndex(t => t.name === name)
    if (existingIndex >= 0) {
      data[tenantId][existingIndex] = template
    } else {
      data[tenantId].push(template)
    }

    await writeMasterTemplatesFile(data)
    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error saving master template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
