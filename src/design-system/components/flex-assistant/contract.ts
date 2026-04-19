import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-assistant',
  variants: [
    {
      name: 'Default',
      description:
        'Interactive chat custom element with message display, text input, and send button. Renders client-side only.',
    },
  ],
  behavior: [
    {
      description:
        'Dispatches assistant:message-submitted custom event with text detail on form submit.',
      tested: false,
    },
    {
      description:
        'Exposes addMessage(role, html) and clearMessages() methods for external control.',
      tested: false,
    },
    {
      description:
        'Dispatches assistant:toggled custom event when close button is clicked.',
      tested: false,
    },
  ],
}
