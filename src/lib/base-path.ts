/**
 * Get the base path for the application from the BASE_PATH environment variable.
 * Ensures the path has a leading slash and trailing slash.
 *
 * @example
 * // No BASE_PATH set
 * getBasePath() // => '/'
 *
 * @example
 * // BASE_PATH=/main
 * getBasePath() // => '/main/'
 *
 * @returns The normalized base path with leading and trailing slashes
 */
export function getBasePath(): string {
  const raw = process.env.BASE_PATH || '/'
  let path = raw

  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  // Ensure trailing slash
  if (!path.endsWith('/')) {
    path = `${path}/`
  }

  return path
}

/**
 * Resolve a URL by prepending the base path if necessary.
 * Handles both absolute and relative paths.
 *
 * @example
 * // No BASE_PATH set
 * resolveUrl('/catalog') // => '/catalog'
 *
 * @example
 * // BASE_PATH=/main
 * resolveUrl('/catalog') // => '/main/catalog'
 *
 * @param path The path to resolve
 * @returns The resolved URL with base path prepended
 */
export function resolveUrl(path: string): string {
  const base = getBasePath()

  // If base path is root, return path as-is
  if (base === '/') {
    return path
  }

  // Remove leading slash from path if present
  const clean = path.startsWith('/') ? path.slice(1) : path

  // Combine base path with clean path
  return `${base}${clean}`
}
