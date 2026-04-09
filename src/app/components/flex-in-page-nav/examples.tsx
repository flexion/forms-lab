import type { FC } from 'hono/jsx'
import { InPageNav } from './index'

export const DefaultInPageNav: FC = () => (
  <div style="display: grid; grid-template-columns: 1fr 15rem; gap: 2rem;">
    <main>
      <h2>Overview</h2>
      <p>
        This is the overview section of the page. It provides a high-level
        introduction to the content below.
      </p>
      <h2>Getting started</h2>
      <p>
        Here you will find instructions on how to get started with this feature.
      </p>
      <h3>Installation</h3>
      <p>Step-by-step installation instructions go here.</p>
      <h3>Configuration</h3>
      <p>Configuration details and options are described here.</p>
      <h2>Usage</h2>
      <p>Examples of how to use this feature in your project.</p>
      <h2>API Reference</h2>
      <p>Detailed API documentation for developers.</p>
    </main>
    <aside>
      <InPageNav />
    </aside>
  </div>
)

export const CustomHeadingLevels: FC = () => (
  <div style="display: grid; grid-template-columns: 1fr 15rem; gap: 2rem;">
    <main>
      <h2>Section One</h2>
      <p>Content for section one.</p>
      <h2>Section Two</h2>
      <p>Content for section two.</p>
      <h2>Section Three</h2>
      <p>Content for section three.</p>
    </main>
    <aside>
      <InPageNav headingLevels="h2" heading="Sections" />
    </aside>
  </div>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 48px;">
    <div>
      <h3>Default (h2, h3)</h3>
      <DefaultInPageNav />
    </div>
    <div>
      <h3>Custom heading levels (h2 only)</h3>
      <CustomHeadingLevels />
    </div>
  </div>
)
