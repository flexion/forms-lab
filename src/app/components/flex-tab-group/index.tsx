import type { Child, FC } from 'hono/jsx'

interface TabProps {
  title: string
  children: Child
}

export const Tab: FC<TabProps> = ({ title, children }) => (
  <div data-tab-title={title}>{children}</div>
)

interface TabGroupProps {
  label: string
  children: Child
}

interface TabNode {
  props?: { title?: string; children?: Child }
}

const isTabNode = (child: Child): child is Child & TabNode =>
  child != null && typeof child === 'object' && 'props' in child

let tabGroupCounter = 0

export const TabGroup: FC<TabGroupProps> = ({ label, children }) => {
  const id = `tab-group-${++tabGroupCounter}`
  const tabs = Array.isArray(children) ? children : [children]

  return (
    <flex-tab-group>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, i) => {
          const title = isTabNode(tab)
            ? (tab.props?.title ?? `Tab ${i + 1}`)
            : `Tab ${i + 1}`
          const panelId = `${id}-panel-${i}`
          const tabId = `${id}-tab-${i}`
          return (
            <button
              type="button"
              role="tab"
              aria-selected={i === 0 ? 'true' : 'false'}
              aria-controls={panelId}
              id={tabId}
              tabindex={i === 0 ? undefined : -1}
              class="flex-tab-group__tab"
            >
              {title}
            </button>
          )
        })}
      </div>
      {tabs.map((tab, i) => {
        const panelId = `${id}-panel-${i}`
        const tabId = `${id}-tab-${i}`
        return (
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={i !== 0}
            class="flex-tab-group__panel"
          >
            {isTabNode(tab) ? (tab.props?.children ?? tab) : tab}
          </div>
        )
      })}
    </flex-tab-group>
  )
}
