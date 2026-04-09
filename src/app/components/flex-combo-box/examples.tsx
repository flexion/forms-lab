import type { FC } from 'hono/jsx'
import { ComboBox } from './index'

export const DefaultComboBox: FC = () => (
  <ComboBox
    id="fruit"
    name="fruit"
    label="Select a fruit"
    options={[
      { value: 'apple', label: 'Apple' },
      { value: 'apricot', label: 'Apricot' },
      { value: 'avocado', label: 'Avocado' },
      { value: 'banana', label: 'Banana' },
      { value: 'blackberry', label: 'Blackberry' },
      { value: 'blueberry', label: 'Blueberry' },
      { value: 'cherry', label: 'Cherry' },
      { value: 'cranberry', label: 'Cranberry' },
      { value: 'grape', label: 'Grape' },
      { value: 'grapefruit', label: 'Grapefruit' },
      { value: 'lemon', label: 'Lemon' },
      { value: 'lime', label: 'Lime' },
      { value: 'mango', label: 'Mango' },
      { value: 'orange', label: 'Orange' },
      { value: 'papaya', label: 'Papaya' },
      { value: 'peach', label: 'Peach' },
      { value: 'pear', label: 'Pear' },
      { value: 'pineapple', label: 'Pineapple' },
      { value: 'raspberry', label: 'Raspberry' },
      { value: 'strawberry', label: 'Strawberry' },
      { value: 'watermelon', label: 'Watermelon' },
    ]}
  />
)

export const ComboBoxWithDefault: FC = () => (
  <ComboBox
    id="state"
    name="state"
    label="Select a state"
    defaultValue="ny"
    options={[
      { value: 'ca', label: 'California' },
      { value: 'fl', label: 'Florida' },
      { value: 'ny', label: 'New York' },
      { value: 'tx', label: 'Texas' },
      { value: 'wa', label: 'Washington' },
    ]}
  />
)
