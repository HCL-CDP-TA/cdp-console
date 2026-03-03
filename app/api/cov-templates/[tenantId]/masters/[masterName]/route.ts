import { NextRequest, NextResponse } from "next/server"
import { readMasterTemplatesFile, writeMasterTemplatesFile } from "@/lib/cov-templates"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; masterName: string }> },
) {
  const password = request.headers.get("x-master-password")
  if (!password || password !== process.env.MASTER_TEMPLATE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { tenantId, masterName } = await params
    const decodedName = decodeURIComponent(masterName)

    const data = await readMasterTemplatesFile()
    const templates = data[tenantId] || []

    const index = templates.findIndex(t => t.name === decodedName)
    if (index === -1) {
      return NextResponse.json({ error: "Master template not found" }, { status: 404 })
    }

    templates.splice(index, 1)
    data[tenantId] = templates
    await writeMasterTemplatesFile(data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting master template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
