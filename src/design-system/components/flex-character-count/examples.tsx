import type { FC } from 'hono/jsx'
import { CharacterCount } from './index'

export const DefaultCharacterCount: FC = () => (
  <CharacterCount id="message" name="message" label="Message" maxLength={100} />
)

export const RequiredCharacterCount: FC = () => (
  <CharacterCount
    id="bio"
    name="bio"
    label="Short bio"
    maxLength={200}
    required
  />
)
