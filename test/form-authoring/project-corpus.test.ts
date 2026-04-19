// test/form-authoring/project-corpus.test.ts
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadPolicyCorpus } from '../../src/services/rag'

describe('project-scoped corpus loading', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'project-corpus-'))
    mkdirSync(join(tempDir, 'references'), { recursive: true })
    writeFileSync(
      join(tempDir, 'references', 'local-policy.md'),
      `---
formSlug: local-test
title: Local Test Policy
source: Test Source
---

## Section — Test 1.1 (First section)

This is the first test section of local policy.

## Section — Test 1.2 (Second section)

This is the second test section of local policy.
`,
    )
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('loads chunks from projectDir references/', () => {
    const chunks = loadPolicyCorpus({ projectDir: tempDir })
    expect(chunks.length).toBe(2)
    expect(chunks[0].formSlug).toBe('local-test')
    expect(chunks[0].source).toBe('Test 1.1 (First section)')
  })

  test('combines catalog and project corpus', () => {
    const chunks = loadPolicyCorpus({ projectDir: tempDir })
    const catalogChunks = loadPolicyCorpus()
    expect(chunks.length).toBe(2)
    expect(catalogChunks.length).toBeGreaterThan(0)
  })

  test('returns empty array when projectDir has no references/', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'empty-project-'))
    const chunks = loadPolicyCorpus({ projectDir: emptyDir })
    expect(chunks).toEqual([])
    rmSync(emptyDir, { recursive: true, force: true })
  })
})
