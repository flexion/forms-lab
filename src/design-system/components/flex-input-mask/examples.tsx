import type { FC } from 'hono/jsx'
import { InputMask, masks } from './index'

export const PhoneInputMask: FC = () => (
  <InputMask
    id="phone"
    name="phone"
    label="Phone number"
    mask={masks.phone}
    inputMode="tel"
  />
)

export const SSNInputMask: FC = () => (
  <InputMask
    id="ssn"
    name="ssn"
    label="Social Security number"
    mask={masks.ssn}
  />
)

export const ZipInputMask: FC = () => (
  <InputMask id="zip" name="zip" label="ZIP code + 4" mask={masks.zip} />
)
