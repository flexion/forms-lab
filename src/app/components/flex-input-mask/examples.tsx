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

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Phone</h3>
      <PhoneInputMask />
    </div>
    <div>
      <h3>SSN</h3>
      <SSNInputMask />
    </div>
    <div>
      <h3>ZIP+4</h3>
      <ZipInputMask />
    </div>
  </div>
)
