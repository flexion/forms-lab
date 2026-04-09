import type { FC } from 'hono/jsx'
import { Radio } from './index'

export const Default: FC = () => (
  <fieldset>
    <legend>Choices</legend>
    <Radio id="r-1" name="choices" value="1" label="Choice 1" />
    <Radio id="r-2" name="choices" value="2" label="Choice 2" />
    <Radio id="r-3" name="choices" value="3" label="Choice 3" />
  </fieldset>
)

export const Checked: FC = () => (
  <Radio id="r-checked" name="test" value="yes" label="Pre-selected" checked />
)

export const Disabled: FC = () => (
  <Radio
    id="r-disabled"
    name="test-disabled"
    value="no"
    label="Disabled option"
    disabled
  />
)

export const Tile: FC = () => (
  <fieldset>
    <legend>Tile radios</legend>
    <Radio id="r-tile-1" name="tiles" value="1" label="Tile option 1" tile />
    <Radio id="r-tile-2" name="tiles" value="2" label="Tile option 2" tile />
    <Radio
      id="r-tile-3"
      name="tiles"
      value="3"
      label="Tile option 3"
      tile
      checked
    />
  </fieldset>
)
