import { PDFDocument } from 'pdf-lib'

export async function enumerateFields(pdf: Buffer): Promise<string[]> {
  if (!pdf || pdf.length === 0) return []
  try {
    const doc = await PDFDocument.load(pdf, { ignoreEncryption: true })
    const form = doc.getForm()
    return form.getFields().map((field) => field.getName())
  } catch {
    return []
  }
}
