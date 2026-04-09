import type { FC } from 'hono/jsx'

interface SearchProps {
  size?: 'big' | 'small'
  action?: string
  label?: string
  placeholder?: string
  id?: string
}

export const Search: FC<SearchProps> = ({
  size,
  action,
  label = 'Search',
  placeholder,
  id = 'search',
}) => {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="search" on form is the USWDS pattern
    <form
      class="flex-search"
      role="search"
      data-size={size}
      action={action}
      method="get"
    >
      <label class="flex-search__label" for={id}>
        {label}
      </label>
      <input
        class="flex-search__input"
        id={id}
        type="search"
        name="search"
        placeholder={placeholder}
      />
      <button class="flex-search__submit" type="submit">
        <span class="flex-search__submit-text">Search</span>
      </button>
    </form>
  )
}
