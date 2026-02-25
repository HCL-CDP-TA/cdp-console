import { NextRequest, NextResponse } from "next/server"
import { readTemplatesFile, writeTemplatesFile } from "@/lib/cov-templates"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; templateName: string }> },
) {
  try {
    const { tenantId, templateName } = await params
    const decodedName = decodeURIComponent(templateName)

    const data = await readTemplatesFile()
    const templates = data[tenantId] || []

    const index = templates.findIndex(t => t.name === decodedName)
    if (index === -1) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    templates.splice(index, 1)
    data[tenantId] = templates
    await writeTemplatesFile(data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting COV template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
