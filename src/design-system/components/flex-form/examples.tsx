import type { FC } from 'hono/jsx'
import { Form } from './index'

export const Default: FC = () => (
  <Form>
    <p>Form content goes here.</p>
  </Form>
)

export const WithAction: FC = () => (
  <Form action="/submit" method="post">
    <p>Form with action and method.</p>
  </Form>
)

export const Large: FC = () => (
  <Form size="large">
    <p>Large size form.</p>
  </Form>
)
