import type { FC } from 'hono/jsx'
import { SideNav, SideNavItem, SideNavNested, SideNavSubItem } from './index'

export const Default: FC = () => (
  <SideNav>
    <SideNavItem href="/page1" current>
      Current Page
    </SideNavItem>
    <SideNavItem href="/page2">Another Page</SideNavItem>
    <SideNavItem href="/page3">Third Page</SideNavItem>
  </SideNav>
)

export const WithSubnav: FC = () => (
  <SideNav>
    <SideNavItem href="/page1">First Page</SideNavItem>
    <SideNavNested href="/page2" label="Second Page">
      <SideNavSubItem href="/page2/sub1" current>
        Subpage 1
      </SideNavSubItem>
      <SideNavSubItem href="/page2/sub2">Subpage 2</SideNavSubItem>
    </SideNavNested>
    <SideNavItem href="/page3">Third Page</SideNavItem>
  </SideNav>
)

export const ThreeLevels: FC = () => (
  <SideNav>
    <SideNavItem href="/page1">First Page</SideNavItem>
    <SideNavNested href="/page2" label="Second Page">
      <li class="flex-sidenav__item">
        <a href="/page2/sub1" class="flex-sidenav__link">
          Subpage 1
        </a>
        <ul class="flex-sidenav__sublist">
          <li class="flex-sidenav__item">
            <a
              href="/page2/sub1/detail"
              class="flex-sidenav__link flex-sidenav__link--current"
              aria-current="page"
            >
              Detail Page
            </a>
          </li>
        </ul>
      </li>
      <SideNavSubItem href="/page2/sub2">Subpage 2</SideNavSubItem>
    </SideNavNested>
  </SideNav>
)
