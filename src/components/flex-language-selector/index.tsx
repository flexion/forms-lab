import type { FC } from 'hono/jsx'

interface LanguageSelectorTwoProps {
  href: string
  label: string
  lang: string
}

interface Language {
  href: string
  label: string
  lang: string
}

interface LanguageSelectorProps {
  buttonLabel?: string
  languages: Language[]
  menuId?: string
}

export const LanguageSelectorTwo: FC<LanguageSelectorTwoProps> = ({
  href,
  label,
  lang,
}) => (
  <flex-language-selector data-variant="two">
    <a href={href} class="flex-language-selector__link" lang={lang}>
      {label}
    </a>
  </flex-language-selector>
)

export const LanguageSelector: FC<LanguageSelectorProps> = ({
  buttonLabel = 'Languages',
  languages,
  menuId = 'lang-menu',
}) => (
  <flex-language-selector>
    <button
      type="button"
      class="flex-language-selector__button"
      aria-expanded="false"
      aria-controls={menuId}
    >
      {buttonLabel}
    </button>
    <ul class="flex-language-selector__menu" id={menuId} hidden>
      {languages.map((lang) => (
        <li key={lang.lang}>
          <a
            href={lang.href}
            class="flex-language-selector__link"
            lang={lang.lang}
          >
            {lang.label}
          </a>
        </li>
      ))}
    </ul>
  </flex-language-selector>
)
