import type { FC } from 'hono/jsx'
import { Tab, TabGroup } from './index'

export const DefaultTabs: FC = () => (
  <TabGroup label="Default example">
    <Tab title="First">
      <p>First panel content.</p>
    </Tab>
    <Tab title="Second">
      <p>Second panel content.</p>
    </Tab>
    <Tab title="Third">
      <p>Third panel content.</p>
    </Tab>
  </TabGroup>
)

export const TwoTabs: FC = () => (
  <TabGroup label="Two tab example">
    <Tab title="Preview">
      <p>This is the preview.</p>
    </Tab>
    <Tab title="Code">
      <pre>
        <code>&lt;p&gt;This is the preview.&lt;/p&gt;</code>
      </pre>
    </Tab>
  </TabGroup>
)
