import type { FC } from 'hono/jsx'
import { Button } from '../flex-button/index'
import { ButtonGroup, ButtonGroupItem } from './index'

export const Default: FC = () => (
  <ButtonGroup>
    <ButtonGroupItem>
      <Button>Primary</Button>
    </ButtonGroupItem>
    <ButtonGroupItem>
      <Button variant="outline">Secondary</Button>
    </ButtonGroupItem>
  </ButtonGroup>
)

export const Segmented: FC = () => (
  <ButtonGroup variant="segmented">
    <ButtonGroupItem>
      <Button>First</Button>
    </ButtonGroupItem>
    <ButtonGroupItem>
      <Button>Middle</Button>
    </ButtonGroupItem>
    <ButtonGroupItem>
      <Button>Last</Button>
    </ButtonGroupItem>
  </ButtonGroup>
)

export const WithDisabled: FC = () => (
  <ButtonGroup>
    <ButtonGroupItem>
      <Button>Active</Button>
    </ButtonGroupItem>
    <ButtonGroupItem>
      <Button variant="outline">Cancel</Button>
    </ButtonGroupItem>
    <ButtonGroupItem>
      <Button disabled>Disabled</Button>
    </ButtonGroupItem>
  </ButtonGroup>
)
