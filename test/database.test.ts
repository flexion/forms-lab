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
  it('creates and retrieves a project with slug', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Pardon Application',
      slug: 'pardon-application',
      createdBy: 'testuser',
    })
    expect(project.id).toBeDefined()
    expect(project.name).toBe('Pardon Application')
    expect(project.slug).toBe('pardon-application')
    expect(project.status).toBe('extracting')
    expect(project.createdBy).toBe('testuser')
    expect(project.error).toBeNull()

    const retrieved = store.get(project.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.name).toBe('Pardon Application')
    expect(retrieved?.slug).toBe('pardon-application')
  })

  it('finds by slug', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Test Project',
      slug: 'test-project',
      createdBy: 'user',
    })

    const found = store.getBySlug('test-project')
    expect(found).not.toBeNull()
    expect(found?.id).toBe(project.id)
    expect(found?.name).toBe('Test Project')
  })

  it('returns null for missing project by id and slug', () => {
    const store = createProjectStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
    expect(store.getBySlug('nonexistent')).toBeNull()
  })

  it('lists projects filtered by user', () => {
    const store = createProjectStore(':memory:')
    store.create({ name: 'Project A', slug: 'project-a', createdBy: 'alice' })
    store.create({ name: 'Project B', slug: 'project-b', createdBy: 'bob' })
    store.create({ name: 'Project C', slug: 'project-c', createdBy: 'alice' })

    const aliceProjects = store.list('alice')
    expect(aliceProjects).toHaveLength(2)
    expect(aliceProjects.map((p) => p.name).sort()).toEqual([
      'Project A',
      'Project C',
    ])

    const allProjects = store.list()
    expect(allProjects).toHaveLength(3)
  })

  it('enforces unique slugs', () => {
    const store = createProjectStore(':memory:')
    store.create({ name: 'First', slug: 'unique-slug', createdBy: 'user' })
    expect(() =>
      store.create({ name: 'Second', slug: 'unique-slug', createdBy: 'user' }),
    ).toThrow()
  })

  it('deletes a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Delete Me',
      slug: 'delete-me',
      createdBy: 'testuser',
    })
    expect(store.get(project.id)).not.toBeNull()
    store.delete(project.id)
    expect(store.get(project.id)).toBeNull()
  })

  it('updates project status and error', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Test',
      slug: 'test',
      createdBy: 'user',
    })

    const updated = store.update(project.id, {
      status: 'ready',
    })
    expect(updated.status).toBe('ready')
    expect(updated.error).toBeNull()

    const withError = store.update(project.id, {
      status: 'error',
      error: 'Extraction failed',
    })
    expect(withError.status).toBe('error')
    expect(withError.error).toBe('Extraction failed')
  })
})
