import type { FC } from 'hono/jsx'
import { RangeSlider } from './index'

export const DefaultRangeSlider: FC = () => (
  <RangeSlider id="rating" name="rating" label="Rating" />
)

export const CustomRangeSlider: FC = () => (
  <RangeSlider
    id="temperature"
    name="temperature"
    label="Temperature"
    min={0}
    max={200}
    value={72}
    step={5}
  />
)
