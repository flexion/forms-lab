import type { FC } from 'hono/jsx'

interface Branch {
  name: string
  ahead?: number
}

interface BranchSwitcherProps {
  current: string
  branches: Branch[]
  compareHref: (branch: string) => string
  createHref: string
}

export const BranchSwitcher: FC<BranchSwitcherProps> = ({
  current,
  branches,
  compareHref,
  createHref,
}) => {
  return (
    <flex-branch-switcher class="flex-branch-switcher">
      <button
        type="button"
        class="flex-branch-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="flex-branch-switcher__current">{current}</span>
        <span aria-hidden="true" class="flex-branch-switcher__caret">
          ▾
        </span>
      </button>
      <div class="flex-branch-switcher__panel" role="listbox" hidden>
        <input
          type="search"
          class="flex-branch-switcher__filter"
          placeholder="Find a branch..."
        />
        <ul class="flex-branch-switcher__list">
          {branches.map((b) => (
            // biome-ignore lint/a11y/useFocusableInteractive: option is activated via its child anchor
            <li
              class="flex-branch-switcher__option"
              // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA listbox pattern requires role="option" on li children
              role="option"
              aria-selected={b.name === current ? 'true' : 'false'}
            >
              <a class="flex-branch-switcher__link" href={compareHref(b.name)}>
                {b.name}
              </a>
              {b.ahead != null && b.ahead > 0 ? (
                <span class="flex-branch-switcher__ahead">{b.ahead} ahead</span>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          method="post"
          action={createHref}
          class="flex-branch-switcher__create"
        >
          <input
            class="flex-branch-switcher__create-input"
            name="name"
            placeholder="new-branch-name"
            required
          />
          <button type="submit" class="flex-branch-switcher__create-submit">
            Create branch
          </button>
        </form>
      </div>
    </flex-branch-switcher>
  )
}
