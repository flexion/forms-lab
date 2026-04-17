import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export interface FileEntry {
  path: string
  content: Buffer
}

export interface TreeEntry {
  name: string
  type: 'blob' | 'tree'
  sha: string
}

export interface CommitEntry {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
}

export interface BranchEntry {
  name: string
  sha: string
  ahead: number
}

export interface FormProjectRepo {
  init(slug: string): Promise<void>
  exists(slug: string): boolean
  remove(slug: string): Promise<void>
  commit(
    slug: string,
    files: FileEntry[],
    message: string,
    author: string,
    options?: { branch?: string },
  ): Promise<string>
  readFile(slug: string, rev: string, path: string): Promise<Buffer | null>
  listTree(slug: string, rev: string, path: string): Promise<TreeEntry[]>
  log(
    slug: string,
    rev: string,
    path?: string,
    limit?: number,
  ): Promise<CommitEntry[]>
  cloneBare(sourceSlug: string, destSlug: string): Promise<void>
  headSha(slug: string, ref: string): Promise<string>
  listBranches(slug: string): Promise<BranchEntry[]>
  getBranchDiff(slug: string, base: string, head: string): Promise<string[]>
}

export function createFormProjectRepo(basePath: string): FormProjectRepo {
  function repoDir(slug: string): string {
    return join(basePath, `${slug}.git`)
  }

  async function git(
    slug: string,
    args: string[],
    options?: { env?: Record<string, string>; stdin?: Buffer },
  ): Promise<string> {
    const proc = Bun.spawn(['git', '--git-dir', repoDir(slug), ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: options?.stdin ? 'pipe' : undefined,
      env: { ...process.env, ...options?.env },
    })

    if (options?.stdin && proc.stdin) {
      proc.stdin.write(options.stdin)
      proc.stdin.end()
    }

    const stdout = await new Response(proc.stdout).arrayBuffer()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      throw new Error(
        `git ${args.join(' ')} failed (exit ${exitCode}): ${stderr}`,
      )
    }

    return Buffer.from(stdout).toString()
  }

  async function gitBinary(slug: string, args: string[]): Promise<Buffer> {
    const proc = Bun.spawn(['git', '--git-dir', repoDir(slug), ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = await new Response(proc.stdout).arrayBuffer()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      throw new Error(
        `git ${args.join(' ')} failed (exit ${exitCode}): ${stderr}`,
      )
    }

    return Buffer.from(stdout)
  }

  return {
    async init(slug: string): Promise<void> {
      const dir = repoDir(slug)
      const proc = Bun.spawn(
        ['git', 'init', '--bare', '--initial-branch=main', dir],
        {
          stdout: 'pipe',
          stderr: 'pipe',
        },
      )
      const exitCode = await proc.exited
      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text()
        throw new Error(`git init failed: ${stderr}`)
      }
    },

    exists(slug: string): boolean {
      return existsSync(repoDir(slug))
    },

    async remove(slug: string): Promise<void> {
      const dir = repoDir(slug)
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
      }
    },

    async commit(
      slug: string,
      files: FileEntry[],
      message: string,
      author: string,
      options?: { branch?: string },
    ): Promise<string> {
      const branch = options?.branch ?? 'main'
      const branchRef = `refs/heads/${branch}`
      const indexFile = join(repoDir(slug), `index-${crypto.randomUUID()}`)
      const authorEnv = {
        GIT_INDEX_FILE: indexFile,
        GIT_AUTHOR_NAME: author,
        GIT_AUTHOR_EMAIL: `${author}@users.noreply.github.com`,
        GIT_COMMITTER_NAME: author,
        GIT_COMMITTER_EMAIL: `${author}@users.noreply.github.com`,
      }

      // Check whether the target branch already exists. A branch may be missing
      // even when the repo has commits (e.g. first commit on a new branch).
      const hasBranch = await (async () => {
        try {
          await git(slug, ['rev-parse', '--verify', branchRef])
          return true
        } catch {
          return false
        }
      })()

      try {
        // If the target branch exists, seed the temp index with its tree
        if (hasBranch) {
          await git(slug, ['read-tree', branchRef], { env: authorEnv })
        }

        // Add each file to the index
        for (const file of files) {
          const blobSha = (
            await git(slug, ['hash-object', '-w', '--stdin'], {
              env: authorEnv,
              stdin: file.content,
            })
          ).trim()

          await git(
            slug,
            [
              'update-index',
              '--add',
              '--cacheinfo',
              `100644,${blobSha},${file.path}`,
            ],
            { env: authorEnv },
          )
        }

        // Write the tree
        const treeSha = (
          await git(slug, ['write-tree'], { env: authorEnv })
        ).trim()

        // Create the commit
        const commitArgs = ['commit-tree', treeSha, '-m', message]
        if (hasBranch) {
          commitArgs.push('-p', branchRef)
        }

        const commitSha = (
          await git(slug, commitArgs, { env: authorEnv })
        ).trim()

        // Advance the target branch ref
        await git(slug, ['update-ref', branchRef, commitSha], {
          env: authorEnv,
        })

        // Update server info for dumb HTTP serving
        await git(slug, ['update-server-info'], { env: authorEnv })

        return commitSha
      } finally {
        // Clean up the temp index file
        try {
          const { unlinkSync } = await import('node:fs')
          unlinkSync(indexFile)
        } catch {
          // Index file may not exist if we failed early
        }
      }
    },

    async readFile(
      slug: string,
      rev: string,
      path: string,
    ): Promise<Buffer | null> {
      try {
        return await gitBinary(slug, ['show', `${rev}:${path}`])
      } catch (err) {
        if (err instanceof Error && err.message.includes('exit 128')) {
          return null
        }
        throw err
      }
    },

    async listTree(
      slug: string,
      rev: string,
      path: string,
    ): Promise<TreeEntry[]> {
      const treePath = path ? `${rev}:${path}` : rev
      const output = await git(slug, ['ls-tree', treePath])
      if (!output.trim()) return []

      return output
        .trim()
        .split('\n')
        .map((line) => {
          // Format: <mode> <type> <sha>\t<name>
          const [meta, name] = line.split('\t')
          const [, type, sha] = meta.split(' ')
          return {
            name,
            type: type as 'blob' | 'tree',
            sha,
          }
        })
    },

    async log(
      slug: string,
      rev: string,
      path?: string,
      limit?: number,
    ): Promise<CommitEntry[]> {
      const n = limit ?? 50
      const args = [
        'log',
        `--format=%H%x00%h%x00%s%x00%an%x00%aI`,
        `-n${n}`,
        rev,
      ]
      if (path) {
        args.push('--', path)
      }

      const output = await git(slug, args)
      if (!output.trim()) return []

      return output
        .trim()
        .split('\n')
        .map((line) => {
          const [sha, shortSha, message, author, date] = line.split('\0')
          return { sha, shortSha, message, author, date }
        })
    },

    async cloneBare(sourceSlug: string, destSlug: string): Promise<void> {
      const sourceDir = repoDir(sourceSlug)
      const destDir = repoDir(destSlug)
      const proc = Bun.spawn(['git', 'clone', '--bare', sourceDir, destDir], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const exitCode = await proc.exited
      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text()
        throw new Error(`git clone --bare failed: ${stderr}`)
      }
    },

    async headSha(slug: string, ref: string): Promise<string> {
      return (await git(slug, ['rev-parse', ref])).trim()
    },

    async listBranches(slug: string): Promise<BranchEntry[]> {
      const output = await git(slug, [
        'for-each-ref',
        '--format=%(refname:short)%00%(objectname)',
        'refs/heads/',
      ])
      if (!output.trim()) return []
      const entries = output
        .trim()
        .split('\n')
        .map((line) => {
          const [name, sha] = line.split('\0')
          return { name, sha }
        })
      const result: BranchEntry[] = []
      for (const entry of entries) {
        let ahead = 0
        if (entry.name !== 'main') {
          try {
            const count = await git(slug, [
              'rev-list',
              '--count',
              `main..${entry.name}`,
            ])
            ahead = parseInt(count.trim(), 10) || 0
          } catch {
            ahead = 0
          }
        }
        result.push({ ...entry, ahead })
      }
      return result
    },

    async getBranchDiff(
      slug: string,
      base: string,
      head: string,
    ): Promise<string[]> {
      const output = await git(slug, [
        'diff',
        '--name-only',
        `${base}...${head}`,
      ])
      if (!output.trim()) return []
      return output.trim().split('\n')
    },
  }
}
