import type { FC } from 'hono/jsx'
import { InputGroup } from './index'

export const Default: FC = () => (
  <InputGroup>
    <input class="flex-input" type="text" />
  </InputGroup>
)

export const WithPrefix: FC = () => (
  <InputGroup prefix="$">
    <input class="flex-input" type="text" placeholder="0.00" />
  </InputGroup>
)

export const WithSuffix: FC = () => (
  <InputGroup suffix="lbs">
    <input class="flex-input" type="text" placeholder="Weight" />
  </InputGroup>
)

export const WithPrefixAndSuffix: FC = () => (
  <InputGroup prefix="$" suffix=".00">
    <input class="flex-input" type="text" placeholder="Amount" />
  </InputGroup>
)

export const ErrorState: FC = () => (
  <InputGroup prefix="$" state="error">
    <input class="flex-input" type="text" placeholder="Invalid amount" />
  </InputGroup>
)
