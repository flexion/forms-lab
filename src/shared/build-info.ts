import { execSync } from 'node:child_process'

export interface BuildInfo {
  gitRef: string
  repoUrl: string
  isDirty: boolean
}

const REPO_URL = 'https://github.com/flexion/forms-lab'

let cache: BuildInfo | null = null

export function resetBuildInfoCache(): void {
  cache = null
}

export function getBuildInfo(): BuildInfo {
  if (cache) return cache

  const envSha = process.env.BUILD_GIT_SHA?.trim()
  if (envSha) {
    cache = { gitRef: envSha, repoUrl: REPO_URL, isDirty: false }
    return cache
  }

  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    const dirty =
      execSync('git status --porcelain', {
        encoding: 'utf-8',
      }).trim().length > 0
    if (dirty) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
      }).trim()
      cache = { gitRef: `dev-${branch}`, repoUrl: REPO_URL, isDirty: true }
    } else {
      cache = { gitRef: sha, repoUrl: REPO_URL, isDirty: false }
    }
    return cache
  } catch {
    console.warn('build-info: could not resolve git ref; using "unknown"')
    cache = { gitRef: 'unknown', repoUrl: REPO_URL, isDirty: false }
    return cache
  }
}
