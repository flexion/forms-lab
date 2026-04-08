import type { FC } from 'hono/jsx'

interface FileInputProps {
  id: string
  name: string
  label: string
  accept?: string
  multiple?: boolean
  hint?: string
}

export const FileInput: FC<FileInputProps> = ({
  id,
  name,
  label,
  accept,
  multiple,
  hint,
}) => (
  <flex-file-input>
    <label class="flex-label" for={id}>
      {label}
    </label>
    {hint && (
      <span class="flex-file-input__hint" id={`${id}-hint`}>
        {hint}
      </span>
    )}
    <div class="flex-file-input__target">
      <div class="flex-file-input__instructions" aria-hidden="true">
        Drag file here or{' '}
        <span class="flex-file-input__choose">choose from folder</span>
      </div>
      <input
        class="flex-file-input__input"
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
    <div class="flex-file-input__preview-area" />
  </flex-file-input>
)
