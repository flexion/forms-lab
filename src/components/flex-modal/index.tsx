import type { Child, FC } from 'hono/jsx'

interface ModalProps {
  id: string
  heading: string
  headingId: string
  bodyId: string
  size?: 'large'
  forcedAction?: boolean
  children: Child
  footer?: Child
}

interface ModalTriggerProps {
  modalId: string
  children: Child
}

export const Modal: FC<ModalProps> = ({
  id,
  heading,
  headingId,
  bodyId,
  size,
  forcedAction,
  children,
  footer,
}) => (
  <flex-modal
    id={id}
    hidden
    {...(size ? { 'data-size': size } : {})}
    {...(forcedAction ? { 'data-forced-action': '' } : {})}
  >
    <div class="flex-modal__overlay" />
    <div
      class="flex-modal__content"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={bodyId}
    >
      <div class="flex-modal__main">
        <h2 class="flex-modal__heading" id={headingId}>
          {heading}
        </h2>
        <div class="flex-modal__body" id={bodyId}>
          {children}
        </div>
        {footer && <div class="flex-modal__footer">{footer}</div>}
      </div>
      {!forcedAction && (
        <button
          type="button"
          class="flex-modal__close"
          aria-label="Close this modal"
          data-close-modal
        >
          <svg class="flex-icon" aria-hidden="true" focusable="false">
            <use href="/static/sprite.svg#close" />
          </svg>
        </button>
      )}
    </div>
  </flex-modal>
)

export const ModalTrigger: FC<ModalTriggerProps> = ({ modalId, children }) => (
  <button
    type="button"
    class="flex-button"
    aria-controls={modalId}
    data-open-modal
  >
    {children}
  </button>
)
