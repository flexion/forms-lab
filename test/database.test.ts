import { describe, expect, it } from 'bun:test'
import { createCacheStore, createProjectStore } from '../src/services/database'

describe('CacheStore', () => {
  it('returns null for missing key', () => {
    const store = createCacheStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('stores and retrieves a cache entry', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"spec":{}}')
    const entry = store.get('abc123')
    expect(entry).not.toBeNull()
    expect(entry?.key).toBe('abc123')
    expect(entry?.model).toBe('sonnet-4')
    expect(entry?.result).toBe('{"spec":{}}')
    expect(entry?.createdAt).toBeGreaterThan(0)
  })

  it('overwrites existing entry on same key', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"v":1}')
    store.set('abc123', 'opus-4', '{"v":2}')
    const entry = store.get('abc123')
    expect(entry?.model).toBe('opus-4')
    expect(entry?.result).toBe('{"v":2}')
  })
})

describe('ProjectStore', () => {
  it('creates and retrieves a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Pardon Application',
      description: 'Presidential pardon form',
      sourcePdf: Buffer.from('fake-pdf'),
      createdBy: 'testuser',
    })
    expect(project.id).toBeDefined()
    expect(project.name).toBe('Pardon Application')
    expect(project.status).toBe('extracting')
    expect(project.createdBy).toBe('testuser')

    const retrieved = store.get(project.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.name).toBe('Pardon Application')
    expect(Buffer.from(retrieved!.sourcePdf).toString()).toBe('fake-pdf')
  })

  it('returns null for missing project', () => {
    const store = createProjectStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('lists projects filtered by user', () => {
    const store = createProjectStore(':memory:')
    store.create({
      name: 'Project A',
      description: 'A',
      sourcePdf: Buffer.from('a'),
      createdBy: 'alice',
    })
    store.create({
      name: 'Project B',
      description: 'B',
      sourcePdf: Buffer.from('b'),
      createdBy: 'bob',
    })
    store.create({
      name: 'Project C',
      description: 'C',
      sourcePdf: Buffer.from('c'),
      createdBy: 'alice',
    })

    const aliceProjects = store.list('alice')
    expect(aliceProjects).toHaveLength(2)
    expect(aliceProjects.map((p) => p.name).sort()).toEqual([
      'Project A',
      'Project C',
    ])

    const allProjects = store.list()
    expect(allProjects).toHaveLength(3)
  })

  it('deletes a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Delete Me',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    expect(store.get(project.id)).not.toBeNull()
    store.delete(project.id)
    expect(store.get(project.id)).toBeNull()
  })

  it('updates project fields', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'user',
    })

    const updated = store.update(project.id, {
      status: 'ready',
      spec: { id: 's1', title: 'Spec', description: '', groups: [] },
      formSpec: {
        id: 'f1',
        specId: 's1',
        title: 'Form',
        pages: [],
        createdAt: '',
        updatedAt: '',
      },
      confidence: [{ fieldId: 'f1', confidence: 0.9 }],
    })

    expect(updated.status).toBe('ready')
    expect(updated.spec?.title).toBe('Spec')
    expect(updated.formSpec?.title).toBe('Form')
    expect(updated.confidence).toHaveLength(1)
  })
})
