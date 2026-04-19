import { describe, expect, it } from 'bun:test'
import { PDFDocument } from 'pdf-lib'
import { enumerateFields } from '../../src/services/form-documents'

async function createTestPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const form = doc.getForm()
  form.createTextField('First Name')
  form.createTextField('Last Name')
  form.createTextField('Email')
  form.createCheckBox('Agree to Terms')
  const bytes = await doc.save()
  return Buffer.from(bytes)
}

describe('enumerateFields', () => {
  it('returns all AcroForm field names from a PDF', async () => {
    const pdf = await createTestPdf()
    const fields = await enumerateFields(pdf)
    expect(fields).toEqual([
      'First Name',
      'Last Name',
      'Email',
      'Agree to Terms',
    ])
  })

  it('returns empty array for PDF without form fields', async () => {
    const doc = await PDFDocument.create()
    doc.addPage()
    const bytes = await doc.save()
    const fields = await enumerateFields(Buffer.from(bytes))
    expect(fields).toEqual([])
  })
})
