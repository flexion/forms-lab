import type { FC } from 'hono/jsx'
import {
  Collection,
  CollectionBody,
  CollectionDescription,
  CollectionHeading,
  CollectionItem,
  CollectionMeta,
} from './index'

export const Default: FC = () => (
  <Collection>
    <CollectionItem>
      <CollectionBody>
        <CollectionHeading href="#">
          Improving access to healthcare
        </CollectionHeading>
        <CollectionDescription>
          We are working to improve access to healthcare for all Americans
          through better digital services.
        </CollectionDescription>
        <CollectionMeta>
          <li class="flex-collection__meta-item">Jan 15, 2026</li>
          <li class="flex-collection__meta-item">Health</li>
        </CollectionMeta>
      </CollectionBody>
    </CollectionItem>
    <CollectionItem>
      <CollectionBody>
        <CollectionHeading href="#">
          Digital government strategy
        </CollectionHeading>
        <CollectionDescription>
          The new strategy outlines key priorities for digital transformation
          across federal agencies.
        </CollectionDescription>
        <CollectionMeta>
          <li class="flex-collection__meta-item">Feb 2, 2026</li>
          <li class="flex-collection__meta-item">Technology</li>
        </CollectionMeta>
      </CollectionBody>
    </CollectionItem>
  </Collection>
)

export const Condensed: FC = () => (
  <Collection variant="condensed">
    <CollectionItem>
      <CollectionBody>
        <CollectionHeading href="#">First condensed item</CollectionHeading>
      </CollectionBody>
    </CollectionItem>
    <CollectionItem>
      <CollectionBody>
        <CollectionHeading href="#">Second condensed item</CollectionHeading>
      </CollectionBody>
    </CollectionItem>
    <CollectionItem>
      <CollectionBody>
        <CollectionHeading href="#">Third condensed item</CollectionHeading>
      </CollectionBody>
    </CollectionItem>
  </Collection>
)

export const AllVariants: FC = () => (
  <div style="display: flex; flex-direction: column; gap: 24px;">
    <div>
      <h3>Default Collection</h3>
      <Default />
    </div>
    <div>
      <h3>Condensed Collection</h3>
      <Condensed />
    </div>
  </div>
)
