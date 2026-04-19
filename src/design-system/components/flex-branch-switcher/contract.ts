import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-branch-switcher',
  variants: [
    {
      name: 'Default',
      description:
        'Switcher trigger showing the main branch with a "published" badge; dropdown panel is hidden.',
    },
    {
      name: 'OnFeatureBranch',
      description:
        'Switcher trigger showing a feature branch with an "ahead" count; multiple branches in the list.',
    },
  ],
  behavior: [
    {
      description:
        'Clicking the trigger button opens the dropdown panel by toggling aria-expanded and removing the hidden attribute',
      tested: false,
    },
    {
      description:
        'Filtering the search input narrows the branch list to matching entries',
      tested: false,
    },
    {
      description:
        'Submitting the create-branch form with a valid name navigates to the new branch',
      tested: false,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Branch Switcher Test</h1>
    <nav aria-label="Branch navigation">
      <flex-branch-switcher class="flex-branch-switcher">
        <button type="button" class="flex-branch-switcher__trigger" aria-haspopup="listbox" aria-expanded="false">
          <span class="flex-branch-switcher__current">main</span>
          <span class="flex-branch-switcher__badge">published</span>
          <span aria-hidden="true" class="flex-branch-switcher__caret">▾</span>
        </button>
        <div class="flex-branch-switcher__panel" role="listbox" hidden>
          <input type="search" class="flex-branch-switcher__filter" placeholder="Find a branch..." aria-label="Filter branches" />
          <ul class="flex-branch-switcher__list">
            <li class="flex-branch-switcher__option" role="option" aria-selected="true">
              <a class="flex-branch-switcher__link" href="/main/">main</a>
            </li>
          </ul>
          <form method="post" action="/branches/create" class="flex-branch-switcher__create">
            <label for="new-branch-name" class="usa-sr-only">New branch name</label>
            <input id="new-branch-name" class="flex-text-input flex-branch-switcher__create-input" name="name" placeholder="new-branch-name" required />
            <button type="submit" class="flex-button flex-branch-switcher__create-submit">Create branch</button>
          </form>
        </div>
      </flex-branch-switcher>
    </nav>
  </main>`,
}
