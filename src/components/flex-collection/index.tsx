import type { Child, FC } from 'hono/jsx'

type CollectionVariant = 'condensed'

interface CollectionProps {
  variant?: CollectionVariant
  children: Child
}

export const Collection: FC<CollectionProps> = ({ variant, children }) => {
  return (
    <ul class="flex-collection" data-variant={variant}>
      {children}
    </ul>
  )
}

interface CollectionItemProps {
  children: Child
}

export const CollectionItem: FC<CollectionItemProps> = ({ children }) => {
  return <li class="flex-collection__item">{children}</li>
}

interface CollectionImgProps {
  src: string
  alt: string
}

export const CollectionImg: FC<CollectionImgProps> = ({ src, alt }) => {
  return (
    <div class="flex-collection__img">
      <img src={src} alt={alt} />
    </div>
  )
}

interface CollectionBodyProps {
  children: Child
}

export const CollectionBody: FC<CollectionBodyProps> = ({ children }) => {
  return <div class="flex-collection__body">{children}</div>
}

interface CollectionHeadingProps {
  href: string
  children: Child
}

export const CollectionHeading: FC<CollectionHeadingProps> = ({
  href,
  children,
}) => {
  return (
    <h3 class="flex-collection__heading">
      <a href={href}>{children}</a>
    </h3>
  )
}

interface CollectionDescriptionProps {
  children: Child
}

export const CollectionDescription: FC<CollectionDescriptionProps> = ({
  children,
}) => {
  return <p class="flex-collection__description">{children}</p>
}

interface CollectionMetaProps {
  children: Child
}

export const CollectionMeta: FC<CollectionMetaProps> = ({ children }) => {
  return <ul class="flex-collection__meta">{children}</ul>
}
