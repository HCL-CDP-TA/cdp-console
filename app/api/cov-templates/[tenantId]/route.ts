import { NextRequest, NextResponse } from "next/server"
import { readTemplatesFile, writeTemplatesFile, CovTemplate } from "@/lib/cov-templates"

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const { tenantId } = await params
    const data = await readTemplatesFile()
    const templates = data[tenantId] || []
    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error reading COV templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const { tenantId } = await params
    const body = await request.json()

    const { name, mappings } = body
    if (!name || !Array.isArray(mappings)) {
      return NextResponse.json({ error: "Missing required fields: name, mappings" }, { status: 400 })
    }

    const data = await readTemplatesFile()
    if (!data[tenantId]) {
      data[tenantId] = []
    }

    const template: CovTemplate = {
      name,
      mappings,
      createdAt: new Date().toISOString(),
    }

    // Overwrite if same name exists
    const existingIndex = data[tenantId].findIndex(t => t.name === name)
    if (existingIndex >= 0) {
      data[tenantId][existingIndex] = template
    } else {
      data[tenantId].push(template)
    }

    await writeTemplatesFile(data)
    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error saving COV template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
