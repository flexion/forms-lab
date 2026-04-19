import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-chat-panel',
  variants: [
    {
      name: 'InProgress',
      description:
        'Active conversation: prior messages visible, input form rendered.',
    },
    {
      name: 'Finished',
      description:
        'Completed conversation: final messages visible, input form replaced with a completion notice.',
    },
    {
      name: 'EmptyStart',
      description:
        'Blank starting state: no prior messages, input form ready for the first response.',
    },
  ],
  // No accessibilityFixtureHtml override: per-variant axe audits assert against
  // the real component output. If they surface a11y issues, fix them in
  // index.tsx rather than papering over with a hand-written fixture.
  behavior: [
    {
      description:
        'Renders a textarea + submit control while the conversation is unfinished.',
      tested: false,
    },
    {
      description:
        'Replaces the input form with a "Conversation complete" notice once finished is true.',
      tested: false,
    },
    {
      description:
        'Each message exposes its role via the data-role attribute for styling and assistive tech.',
      tested: false,
    },
  ],
}
