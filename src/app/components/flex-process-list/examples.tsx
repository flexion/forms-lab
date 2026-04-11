import type { FC } from 'hono/jsx'
import { ProcessList } from './index'

const defaultItems = [
  {
    heading: 'Start a process',
    content:
      'Decide on the type of process and gather the necessary information.',
  },
  {
    heading: 'Proceed to the second step',
    content: 'Complete any required forms and submit your application.',
  },
  {
    heading: 'Complete the process',
    content: 'Review your submission and wait for confirmation.',
  },
]

export const Default: FC = () => <ProcessList items={defaultItems} />
