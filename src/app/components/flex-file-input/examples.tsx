import type { FC } from 'hono/jsx'
import { FileInput } from './index'

export const DefaultFileInput: FC = () => (
  <FileInput id="file-upload" name="file-upload" label="Upload a file" />
)

export const ImageOnly: FC = () => (
  <FileInput
    id="image-upload"
    name="image-upload"
    label="Upload an image"
    accept="image/*"
    hint="Select any image file (JPG, PNG, GIF)"
  />
)

export const MultipleFiles: FC = () => (
  <FileInput
    id="multi-upload"
    name="multi-upload"
    label="Upload documents"
    multiple
    accept=".pdf,.doc,.docx"
    hint="Select one or more PDF or Word documents"
  />
)
