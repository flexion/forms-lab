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

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default (0-100, step 1)</h3>
      <DefaultRangeSlider />
    </div>
    <div>
      <h3>Custom range (0-200, step 5)</h3>
      <CustomRangeSlider />
    </div>
  </div>
)
