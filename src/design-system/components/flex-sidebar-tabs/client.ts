class FlexSidebarTabs extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]')
      if (!tab || tab.closest('.sidebar-tabs__panel') || !tab.dataset.tab)
        return
      this.switchTab(tab.dataset.tab)
    })
  }

  switchTab(tabId: string) {
    for (const tab of this.querySelectorAll<HTMLElement>(
      '.sidebar-tabs__tab',
    )) {
      if (tab.dataset.tab === tabId) {
        tab.dataset.active = ''
      } else {
        delete tab.dataset.active
      }
    }
    for (const panel of this.querySelectorAll<HTMLElement>(
      '.sidebar-tabs__panel',
    )) {
      panel.hidden = panel.dataset.tabPanel !== tabId
    }
  }
}

if (!customElements.get('flex-sidebar-tabs')) {
  customElements.define('flex-sidebar-tabs', FlexSidebarTabs)
}
