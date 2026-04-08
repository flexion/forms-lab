import type { Child, FC } from 'hono/jsx'

type TableVariant = 'borderless'

interface TableProps {
  variant?: TableVariant
  striped?: boolean
  compact?: boolean
  stacked?: boolean
  stackedHeader?: boolean
  stickyHeader?: boolean
  children: Child
}

export const Table: FC<TableProps> = ({
  variant,
  striped,
  compact,
  stacked,
  stackedHeader,
  stickyHeader,
  children,
}) => {
  return (
    <table
      class="flex-table"
      data-variant={variant}
      data-striped={striped || undefined}
      data-compact={compact || undefined}
      data-stacked={stacked || undefined}
      data-stacked-header={stackedHeader || undefined}
      data-sticky-header={stickyHeader || undefined}
    >
      {children}
    </table>
  )
}

interface ScrollableTableProps {
  children: Child
}

export const ScrollableTable: FC<ScrollableTableProps> = ({ children }) => {
  return (
    <div class="flex-table__container" data-scrollable tabindex={0}>
      {children}
    </div>
  )
}
