import type { FC } from 'hono/jsx'
import { Accordion } from './index'

export const DefaultAccordion: FC = () => (
  <Accordion
    items={[
      { id: 'first', title: 'First Amendment', content: <p>Congress shall make no law...</p> },
      { id: 'second', title: 'Second Amendment', content: <p>A well regulated Militia...</p> },
      {
        id: 'third',
        title: 'Third Amendment',
        content: <p>No Soldier shall, in time of peace...</p>,
        expanded: true,
      },
    ]}
  />
)

export const BorderedAccordion: FC = () => (
  <Accordion
    variant="bordered"
    items={[
      { id: 'b-first', title: 'First section', content: <p>First section content.</p> },
      {
        id: 'b-second',
        title: 'Second section',
        content: <p>Second section content.</p>,
        expanded: true,
      },
      { id: 'b-third', title: 'Third section', content: <p>Third section content.</p> },
    ]}
  />
)

export const MultiselectableAccordion: FC = () => (
  <Accordion
    multiselectable
    items={[
      {
        id: 'm-first',
        title: 'First section',
        content: <p>First section content.</p>,
        expanded: true,
      },
      {
        id: 'm-second',
        title: 'Second section',
        content: <p>Second section content.</p>,
        expanded: true,
      },
      { id: 'm-third', title: 'Third section', content: <p>Third section content.</p> },
    ]}
  />
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default (borderless)</h3>
      <DefaultAccordion />
    </div>
    <div>
      <h3>Bordered</h3>
      <BorderedAccordion />
    </div>
    <div>
      <h3>Multiselectable</h3>
      <MultiselectableAccordion />
    </div>
  </div>
)
