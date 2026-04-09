import { Icon } from './index'

export const defaultIcons = () => (
  <div class="l-cluster">
    <Icon name="info" />
    <Icon name="check_circle" />
    <Icon name="warning" />
    <Icon name="error" />
    <Icon name="close" />
    <Icon name="search" />
    <Icon name="navigate_next" />
    <Icon name="navigate_before" />
    <Icon name="add" />
    <Icon name="remove" />
  </div>
)

export const sizedIcons = () => (
  <div class="l-cluster">
    <Icon name="info" size="3" />
    <Icon name="info" size="4" />
    <Icon name="info" size="5" />
    <Icon name="info" size="6" />
    <Icon name="info" size="7" />
  </div>
)

export const accessibleIcon = () => (
  <Icon name="warning" label="Warning" size="4" />
)

export const iconInText = () => (
  <p>
    Click the <Icon name="settings" /> icon to configure.
  </p>
)
