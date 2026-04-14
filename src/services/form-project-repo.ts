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

export interface FormProjectRepo {
  init(slug: string): Promise<void>
  commit(
    slug: string,
    files: FileEntry[],
    message: string,
    author: string,
  ): Promise<string>
  readFile(slug: string, rev: string, path: string): Promise<Buffer | null>
  listTree(slug: string, rev: string, path: string): Promise<TreeEntry[]>
  log(
    slug: string,
    rev: string,
    path?: string,
    limit?: number,
  ): Promise<CommitEntry[]>
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

  async function gitBinary(
    slug: string,
    args: string[],
  ): Promise<Buffer | null> {
    const proc = Bun.spawn(['git', '--git-dir', repoDir(slug), ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = await new Response(proc.stdout).arrayBuffer()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      return null
    }

    return Buffer.from(stdout)
  }

  async function hasHead(slug: string): Promise<boolean> {
    const proc = Bun.spawn(
      ['git', '--git-dir', repoDir(slug), 'rev-parse', '--verify', 'HEAD'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    await proc.exited
    return proc.exitCode === 0
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

    async commit(
      slug: string,
      files: FileEntry[],
      message: string,
      author: string,
    ): Promise<string> {
      const indexFile = join(repoDir(slug), `index-${Date.now()}`)
      const authorEnv = {
        GIT_INDEX_FILE: indexFile,
        GIT_AUTHOR_NAME: author,
        GIT_AUTHOR_EMAIL: `${author}@users.noreply.github.com`,
        GIT_COMMITTER_NAME: author,
        GIT_COMMITTER_EMAIL: `${author}@users.noreply.github.com`,
      }

      try {
        // If HEAD exists, seed the temp index with the current tree
        if (await hasHead(slug)) {
          await git(slug, ['read-tree', 'HEAD'], { env: authorEnv })
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
        if (await hasHead(slug)) {
          commitArgs.push('-p', 'HEAD')
        }

        const commitSha = (
          await git(slug, commitArgs, { env: authorEnv })
        ).trim()

        // Update the main branch ref
        await git(slug, ['update-ref', 'refs/heads/main', commitSha], {
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
      return gitBinary(slug, ['show', `${rev}:${path}`])
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
  }
}
