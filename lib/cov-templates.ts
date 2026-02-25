import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"

export interface CovTemplate {
  name: string
  mappings: { key: string; value: string }[]
  createdAt: string
}

export type CovTemplatesFile = Record<string, CovTemplate[]>

const TEMPLATES_FILE = path.join(process.cwd(), "data", "cov-templates.json")

export async function readTemplatesFile(): Promise<CovTemplatesFile> {
  try {
    const content = await readFile(TEMPLATES_FILE, "utf-8")
    return JSON.parse(content)
  } catch {
    // Auto-create if missing
    await mkdir(path.dirname(TEMPLATES_FILE), { recursive: true })
    await writeFile(TEMPLATES_FILE, "{}", "utf-8")
    return {}
  }
}

export async function writeTemplatesFile(data: CovTemplatesFile): Promise<void> {
  await mkdir(path.dirname(TEMPLATES_FILE), { recursive: true })
  await writeFile(TEMPLATES_FILE, JSON.stringify(data, null, 2), "utf-8")
}
