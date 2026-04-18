import type { FC } from 'hono/jsx'

interface Branch {
  name: string
  ahead?: number
}

interface BranchSwitcherProps {
  current: string
  branches: Branch[]
  branchHref: (branch: string) => string
  createHref: string
}

export const BranchSwitcher: FC<BranchSwitcherProps> = ({
  current,
  branches,
  branchHref,
  createHref,
}) => {
  const currentAhead = branches.find((b) => b.name === current)?.ahead ?? 0
  return (
    <flex-branch-switcher class="flex-branch-switcher">
      <button
        type="button"
        class="flex-branch-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <svg
          aria-hidden="true"
          class="flex-branch-switcher__icon"
          width="14"
          height="14"
          viewBox="0 0 16 16"
        >
          <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
        </svg>
        <span class="flex-branch-switcher__current">{current}</span>
        {current === 'main' ? (
          <span class="flex-branch-switcher__badge">published</span>
        ) : currentAhead > 0 ? (
          <span class="flex-branch-switcher__trigger-meta">
            {currentAhead} ahead
          </span>
        ) : null}
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
              <a class="flex-branch-switcher__link" href={branchHref(b.name)}>
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
            class="flex-text-input flex-branch-switcher__create-input"
            name="name"
            placeholder="new-branch-name"
            required
          />
          <button
            type="submit"
            class="flex-button flex-branch-switcher__create-submit"
          >
            Create branch
          </button>
        </form>
      </div>
    </flex-branch-switcher>
  )
}
