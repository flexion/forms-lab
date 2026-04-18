import { PDFDocument } from 'pdf-lib'

export async function enumerateFields(pdf: Buffer): Promise<string[]> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true })
  try {
    const form = doc.getForm()
    return form.getFields().map((field) => field.getName())
  } catch {
    return []
  }
}
