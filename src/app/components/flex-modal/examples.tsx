import type { FC } from 'hono/jsx'
import { Modal, ModalTrigger } from './index'

export const DefaultModal: FC = () => (
  <div>
    <ModalTrigger modalId="modal-default">Open default modal</ModalTrigger>
    <Modal
      id="modal-default"
      heading="Are you sure?"
      headingId="modal-default-heading"
      bodyId="modal-default-body"
      footer={
        <button type="button" class="flex-button" data-close-modal>
          Close
        </button>
      }
    >
      <p>This is the default modal content.</p>
    </Modal>
  </div>
)

export const LargeModal: FC = () => (
  <div>
    <ModalTrigger modalId="modal-large">Open large modal</ModalTrigger>
    <Modal
      id="modal-large"
      heading="Large modal"
      headingId="modal-large-heading"
      bodyId="modal-large-body"
      size="large"
      footer={
        <button type="button" class="flex-button" data-close-modal>
          Close
        </button>
      }
    >
      <p>This is a large modal with wider max-width.</p>
    </Modal>
  </div>
)

export const ForcedActionModal: FC = () => (
  <div>
    <ModalTrigger modalId="modal-forced">Open forced action modal</ModalTrigger>
    <Modal
      id="modal-forced"
      heading="Action required"
      headingId="modal-forced-heading"
      bodyId="modal-forced-body"
      forcedAction
      footer={
        <button type="button" class="flex-button" data-close-modal>
          Accept and close
        </button>
      }
    >
      <p>
        You must take an action. This modal cannot be closed by clicking the
        overlay or pressing Escape.
      </p>
    </Modal>
  </div>
)
