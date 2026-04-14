import type { Child, FC, PropsWithChildren } from 'hono/jsx'
import { resolveUrl } from '../../../shared/base-path'

interface PresentLayoutProps {
  title?: string
  nav?: Child
}

export const PresentLayout: FC<PropsWithChildren<PresentLayoutProps>> = (
  props,
) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  return (
    <html lang="en" data-theme="auto">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'||t==='dark'||t==='auto')document.documentElement.setAttribute('data-theme',t)})()`,
          }}
        />
        <link rel="stylesheet" href={resolveUrl('/static/styles.css')} />
      </head>
      <body>
        <main class="flex-present-layout">
          <div class="flex-present-layout__content">{props.children}</div>
          {props.nav && <div class="flex-present-layout__nav">{props.nav}</div>}
        </main>
        <script type="module" src={resolveUrl('/static/components.js')} />
      </body>
    </html>
  )
}
