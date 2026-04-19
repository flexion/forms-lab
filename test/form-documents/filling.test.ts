import { describe, expect, it } from 'bun:test'
import { PDFDocument } from 'pdf-lib'
import type { FieldMapping } from '../../src/services/form-documents'
import { fillPdf } from '../../src/services/form-documents'

async function createTestPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage()
  const form = doc.getForm()
  form.createTextField('First Name')
  form.createTextField('Last Name')
  form.createTextField('Email')
  const checkbox = form.createCheckBox('Agree to Terms')
  checkbox.addToPage(page, { x: 50, y: 50 })
  form.createDropdown('Employment Type')
  const dropdown = form.getDropdown('Employment Type')
  dropdown.addOptions(['Full-time', 'Part-time', 'Contract'])
  const bytes = await doc.save()
  return Buffer.from(bytes)
}

describe('fillPdf', () => {
  it('fills text fields with submission data', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
    }
    const data = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    }

    const result = await fillPdf(pdf, mapping, data)

    const doc = await PDFDocument.load(result.pdf)
    const form = doc.getForm()
    expect(form.getTextField('First Name').getText()).toBe('Jane')
    expect(form.getTextField('Last Name').getText()).toBe('Doe')
    expect(form.getTextField('Email').getText()).toBe('jane@example.com')
    expect(result.unmappedFields).toEqual([])
    expect(result.emptyFields).toEqual([])
  })

  it('checks checkboxes when value is truthy', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = { agreeTerms: 'Agree to Terms' }
    const data = { agreeTerms: true }

    const result = await fillPdf(pdf, mapping, data)

    const doc = await PDFDocument.load(result.pdf)
    const form = doc.getForm()
    expect(form.getCheckBox('Agree to Terms').isChecked()).toBe(true)
  })

  it('selects dropdown options', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = { employmentType: 'Employment Type' }
    const data = { employmentType: 'Part-time' }

    const result = await fillPdf(pdf, mapping, data)

    const doc = await PDFDocument.load(result.pdf)
    const form = doc.getForm()
    expect(form.getDropdown('Employment Type').getSelected()).toEqual([
      'Part-time',
    ])
  })

  it('reports unmapped fields (data keys not in mapping)', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = { firstName: 'First Name' }
    const data = { firstName: 'Jane', extraField: 'value' }

    const result = await fillPdf(pdf, mapping, data)
    expect(result.unmappedFields).toEqual(['extraField'])
  })

  it('reports empty fields (mapped but no data)', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = {
      firstName: 'First Name',
      lastName: 'Last Name',
    }
    const data = { firstName: 'Jane' }

    const result = await fillPdf(pdf, mapping, data)
    expect(result.emptyFields).toEqual(['lastName'])
  })

  it('handles null/undefined values gracefully', async () => {
    const pdf = await createTestPdf()
    const mapping: FieldMapping = { firstName: 'First Name' }
    const data = { firstName: null }

    const result = await fillPdf(pdf, mapping, data)
    expect(result.emptyFields).toEqual(['firstName'])
  })
})
