import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib'
import type { FieldMapping, FillResult } from './types'

export async function fillPdf(
  sourcePdf: Buffer,
  fieldMapping: FieldMapping,
  data: Record<string, unknown>,
): Promise<FillResult> {
  const doc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
  const form = doc.getForm()

  const unmappedFields: string[] = []
  const emptyFields: string[] = []

  const mappedSpecFields = new Set(Object.keys(fieldMapping))

  for (const [specField, pdfFieldName] of Object.entries(fieldMapping)) {
    const value = data[specField]
    if (value === null || value === undefined || value === '') {
      emptyFields.push(specField)
      continue
    }

    const field = form.getField(pdfFieldName)

    if (field instanceof PDFTextField) {
      field.setText(String(value))
    } else if (field instanceof PDFCheckBox) {
      if (value === true || value === 'true' || value === 'Yes') {
        field.check()
      } else {
        field.uncheck()
      }
    } else if (field instanceof PDFDropdown) {
      field.select(String(value))
    } else if (field instanceof PDFRadioGroup) {
      field.select(String(value))
    }
  }

  for (const key of Object.keys(data)) {
    if (!mappedSpecFields.has(key)) {
      unmappedFields.push(key)
    }
  }

  const pdfBytes = await doc.save()
  return { pdf: pdfBytes, unmappedFields, emptyFields }
}
