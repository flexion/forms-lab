import type { FC } from 'hono/jsx'
import { SummaryBox } from './index'

export const Default: FC = () => (
  <SummaryBox heading="Key information">
    <ul>
      <li>
        First key point with <a href="/example">a link</a>
      </li>
      <li>Second key point</li>
      <li>Third key point</li>
    </ul>
  </SummaryBox>
)

export const WithParagraph: FC = () => (
  <SummaryBox heading="Important notice" headingId="notice-heading">
    <p>
      This is a summary of the most important information on the page, presented
      in a callout box for visibility.
    </p>
  </SummaryBox>
)

export const AllVariants: FC = () => (
  <div class="l-stack">
    <h3>Default Summary Box</h3>
    <Default />
    <h3>With Paragraph Content</h3>
    <WithParagraph />
  </div>
)
