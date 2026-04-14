import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FormProjectRepo } from '../src/services/form-project-repo'
import { createFormProjectRepo } from '../src/services/form-project-repo'

describe('FormProjectRepo', () => {
  let basePath: string
  let repo: FormProjectRepo

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'form-project-repo-'))
    repo = createFormProjectRepo(basePath)
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  describe('init', () => {
    it('creates a bare git repo', async () => {
      await repo.init('test-project')
      const { existsSync } = await import('node:fs')
      const repoDir = join(basePath, 'test-project.git')
      expect(existsSync(repoDir)).toBe(true)
      expect(existsSync(join(repoDir, 'HEAD'))).toBe(true)
    })
  })

  describe('commit + readFile', () => {
    it('commits files and reads them back', async () => {
      await repo.init('proj')
      const sha = await repo.commit(
        'proj',
        [
          { path: 'hello.txt', content: Buffer.from('Hello, world!') },
          { path: 'data.json', content: Buffer.from('{"key":"value"}') },
        ],
        'initial commit',
        'testuser',
      )

      expect(sha).toMatch(/^[0-9a-f]{40}$/)

      const content = await repo.readFile('proj', 'HEAD', 'hello.txt')
      expect(content).not.toBeNull()
      expect(content?.toString()).toBe('Hello, world!')

      const json = await repo.readFile('proj', 'HEAD', 'data.json')
      expect(json).not.toBeNull()
      expect(json?.toString()).toBe('{"key":"value"}')
    })

    it('returns null for missing file', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [{ path: 'exists.txt', content: Buffer.from('yes') }],
        'add file',
        'testuser',
      )
      const result = await repo.readFile('proj', 'HEAD', 'nope.txt')
      expect(result).toBeNull()
    })

    it('preserves files from previous commits', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [{ path: 'first.txt', content: Buffer.from('first') }],
        'first commit',
        'testuser',
      )
      await repo.commit(
        'proj',
        [{ path: 'second.txt', content: Buffer.from('second') }],
        'second commit',
        'testuser',
      )

      const first = await repo.readFile('proj', 'HEAD', 'first.txt')
      expect(first).not.toBeNull()
      expect(first?.toString()).toBe('first')

      const second = await repo.readFile('proj', 'HEAD', 'second.txt')
      expect(second).not.toBeNull()
      expect(second?.toString()).toBe('second')
    })

    it('handles nested paths', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [
          {
            path: 'src/components/button.tsx',
            content: Buffer.from('export const Button = () => {}'),
          },
        ],
        'add nested file',
        'testuser',
      )

      const content = await repo.readFile(
        'proj',
        'HEAD',
        'src/components/button.tsx',
      )
      expect(content).not.toBeNull()
      expect(content?.toString()).toBe('export const Button = () => {}')
    })

    it('handles binary content (PDF)', async () => {
      await repo.init('proj')
      const pdfBytes = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x00, 0xff, 0xd8, 0xff,
        0xe0,
      ])
      await repo.commit(
        'proj',
        [{ path: 'doc.pdf', content: pdfBytes }],
        'add pdf',
        'testuser',
      )

      const content = await repo.readFile('proj', 'HEAD', 'doc.pdf')
      expect(content).not.toBeNull()
      expect(content ? Buffer.compare(content, pdfBytes) : -1).toBe(0)
    })
  })

  describe('log', () => {
    it('returns commit history', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('a') }],
        'first',
        'alice',
      )
      await repo.commit(
        'proj',
        [{ path: 'b.txt', content: Buffer.from('b') }],
        'second',
        'bob',
      )

      const entries = await repo.log('proj', 'HEAD')
      expect(entries).toHaveLength(2)
      expect(entries[0].message).toBe('second')
      expect(entries[0].author).toBe('bob')
      expect(entries[1].message).toBe('first')
      expect(entries[1].author).toBe('alice')
      expect(entries[0].sha).toMatch(/^[0-9a-f]{40}$/)
      expect(entries[0].shortSha).toMatch(/^[0-9a-f]+$/)
      expect(entries[0].date).toMatch(/^\d{4}-\d{2}-\d{2}/)
    })

    it('filters log by path', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('a') }],
        'add a',
        'testuser',
      )
      await repo.commit(
        'proj',
        [{ path: 'b.txt', content: Buffer.from('b') }],
        'add b',
        'testuser',
      )
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('a2') }],
        'update a',
        'testuser',
      )

      const entries = await repo.log('proj', 'HEAD', 'a.txt')
      expect(entries).toHaveLength(2)
      expect(entries[0].message).toBe('update a')
      expect(entries[1].message).toBe('add a')
    })

    it('respects limit', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('1') }],
        'one',
        'testuser',
      )
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('2') }],
        'two',
        'testuser',
      )
      await repo.commit(
        'proj',
        [{ path: 'a.txt', content: Buffer.from('3') }],
        'three',
        'testuser',
      )

      const entries = await repo.log('proj', 'HEAD', undefined, 2)
      expect(entries).toHaveLength(2)
      expect(entries[0].message).toBe('three')
      expect(entries[1].message).toBe('two')
    })
  })

  describe('listTree', () => {
    it('lists entries in a directory', async () => {
      await repo.init('proj')
      await repo.commit(
        'proj',
        [
          { path: 'readme.md', content: Buffer.from('# Hello') },
          { path: 'src/index.ts', content: Buffer.from('export {}') },
          { path: 'src/utils.ts', content: Buffer.from('export {}') },
        ],
        'initial',
        'testuser',
      )

      const rootEntries = await repo.listTree('proj', 'HEAD', '')
      expect(rootEntries).toHaveLength(2)
      const names = rootEntries.map((e) => e.name).sort()
      expect(names).toEqual(['readme.md', 'src'])
      const srcEntry = rootEntries.find((e) => e.name === 'src')
      expect(srcEntry?.type).toBe('tree')
      const readmeEntry = rootEntries.find((e) => e.name === 'readme.md')
      expect(readmeEntry?.type).toBe('blob')

      const srcEntries = await repo.listTree('proj', 'HEAD', 'src')
      expect(srcEntries).toHaveLength(2)
      const srcNames = srcEntries.map((e) => e.name).sort()
      expect(srcNames).toEqual(['index.ts', 'utils.ts'])
    })
  })
})
