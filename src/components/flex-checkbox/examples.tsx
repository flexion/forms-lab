import type { FC } from 'hono/jsx'
import { Checkbox } from './index'

export const Default: FC = () => (
  <fieldset>
    <legend>Options</legend>
    <Checkbox id="cb-1" name="options" value="1" label="Option 1" />
    <Checkbox id="cb-2" name="options" value="2" label="Option 2" />
    <Checkbox id="cb-3" name="options" value="3" label="Option 3" />
  </fieldset>
)

export const Checked: FC = () => (
  <Checkbox
    id="cb-checked"
    name="test"
    value="yes"
    label="Pre-checked"
    checked
  />
)

export const Disabled: FC = () => (
  <Checkbox
    id="cb-disabled"
    name="test"
    value="no"
    label="Disabled option"
    disabled
  />
)

export const Indeterminate: FC = () => (
  <Checkbox
    id="cb-indeterminate"
    name="test"
    value="maybe"
    label="Indeterminate"
    indeterminate
  />
)

export const Tile: FC = () => (
  <fieldset>
    <legend>Tile checkboxes</legend>
    <Checkbox
      id="cb-tile-1"
      name="tiles"
      value="1"
      label="Tile option 1"
      tile
    />
    <Checkbox
      id="cb-tile-2"
      name="tiles"
      value="2"
      label="Tile option 2"
      tile
    />
    <Checkbox
      id="cb-tile-3"
      name="tiles"
      value="3"
      label="Tile option 3"
      tile
      checked
    />
  </fieldset>
)
