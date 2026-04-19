import { PDFDocument } from 'pdf-lib'

export async function enumerateFields(pdf: Buffer): Promise<string[]> {
  if (!pdf || !Buffer.isBuffer(pdf)) {
    console.error('enumerateFields called with invalid PDF buffer:', typeof pdf)
    return []
  }
  try {
    const doc = await PDFDocument.load(pdf, { ignoreEncryption: true })
    const form = doc.getForm()
    return form.getFields().map((field) => field.getName())
  } catch (err) {
    console.error('Failed to enumerate PDF fields:', err)
    return []
  }
}
