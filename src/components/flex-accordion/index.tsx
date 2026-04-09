import type { Child, FC } from 'hono/jsx'

interface AccordionItem {
  id: string
  title: string
  content: Child
  expanded?: boolean
}

interface AccordionProps {
  items: AccordionItem[]
  variant?: 'bordered'
  multiselectable?: boolean
}

export const Accordion: FC<AccordionProps> = ({
  items,
  variant,
  multiselectable,
}) => (
  <flex-accordion
    data-variant={variant}
    data-multiselectable={multiselectable || undefined}
  >
    {items.map((item) => (
      <div key={item.id}>
        <h3 class="flex-accordion__heading">
          <button
            type="button"
            class="flex-accordion__button"
            aria-expanded={item.expanded ? 'true' : 'false'}
            aria-controls={`accordion-panel-${item.id}`}
          >
            {item.title}
          </button>
        </h3>
        <div
          class="flex-accordion__content"
          id={`accordion-panel-${item.id}`}
          hidden={!item.expanded}
        >
          {item.content}
        </div>
      </div>
    ))}
  </flex-accordion>
)
