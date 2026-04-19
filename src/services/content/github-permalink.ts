import type { BuildInfo } from '../../shared/build-info'

export interface PermalinkOptions {
  path: string
  lines?: number | [number, number]
}

export function githubPermalink(
  opts: PermalinkOptions,
  build: BuildInfo,
): string {
  const path = opts.path.startsWith('/') ? opts.path.slice(1) : opts.path
  const base = `${build.repoUrl}/blob/${build.gitRef}/${path}`
  if (opts.lines === undefined) return base
  if (typeof opts.lines === 'number') return `${base}#L${opts.lines}`
  return `${base}#L${opts.lines[0]}-L${opts.lines[1]}`
}
