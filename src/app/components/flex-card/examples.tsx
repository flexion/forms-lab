import type { FC } from 'hono/jsx'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardHeading,
  CardMedia,
} from './index'

export const Default: FC = () => (
  <Card>
    <CardHeader>
      <CardHeading>Card Title</CardHeading>
    </CardHeader>
    <CardMedia src="/static/img/hero.jpg" alt="Placeholder" />
    <CardBody>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore.
      </p>
    </CardBody>
    <CardFooter>
      <a class="flex-button" href="/example">
        Visit
      </a>
    </CardFooter>
  </Card>
)

export const HeaderFirst: FC = () => (
  <Card variant="header-first">
    <CardHeader>
      <CardHeading>Header First</CardHeading>
    </CardHeader>
    <CardMedia src="/static/img/hero.jpg" alt="Placeholder" />
    <CardBody>
      <p>The header appears above the media in this variant.</p>
    </CardBody>
    <CardFooter>
      <a class="flex-button" href="/example">
        Visit
      </a>
    </CardFooter>
  </Card>
)

export const Flag: FC = () => (
  <Card variant="flag">
    <CardHeader>
      <CardHeading>Flag Layout</CardHeading>
    </CardHeader>
    <CardMedia src="/static/img/hero.jpg" alt="Placeholder" />
    <CardBody>
      <p>Horizontal layout with image on the left.</p>
    </CardBody>
  </Card>
)

export const FlagMediaRight: FC = () => (
  <Card variant="flag" mediaRight>
    <CardHeader>
      <CardHeading>Flag Media Right</CardHeading>
    </CardHeader>
    <CardMedia src="/static/img/hero.jpg" alt="Placeholder" />
    <CardBody>
      <p>Horizontal layout with image on the right.</p>
    </CardBody>
  </Card>
)
