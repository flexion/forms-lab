import { Database } from 'bun:sqlite'
import type { DataCollectionSpec } from '../data-collection/types'
import type { FormSpec } from './types'

export interface SpecSnapshot {
  specVersion: string
  specId: string
  dataCollectionSpec: DataCollectionSpec
  formSpec: FormSpec
  cachedAt: string
}

export interface SpecSnapshotStore {
  get(specVersion: string): SpecSnapshot | null
  put(
    specVersion: string,
    specId: string,
    dataCollectionSpec: DataCollectionSpec,
    formSpec: FormSpec,
  ): void
}

export function createSpecSnapshotStore(dbPath: string): SpecSnapshotStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS spec_snapshots (
      spec_version TEXT PRIMARY KEY,
      spec_id TEXT NOT NULL,
      data_collection_spec TEXT NOT NULL,
      form_spec TEXT NOT NULL,
      cached_at TEXT NOT NULL
    )
  `)

  return {
    get(specVersion: string): SpecSnapshot | null {
      const row = db
        .query(
          'SELECT spec_version, spec_id, data_collection_spec, form_spec, cached_at FROM spec_snapshots WHERE spec_version = ?',
        )
        .get(specVersion) as {
        spec_version: string
        spec_id: string
        data_collection_spec: string
        form_spec: string
        cached_at: string
      } | null
      if (!row) return null
      return {
        specVersion: row.spec_version,
        specId: row.spec_id,
        dataCollectionSpec: JSON.parse(
          row.data_collection_spec,
        ) as DataCollectionSpec,
        formSpec: JSON.parse(row.form_spec) as FormSpec,
        cachedAt: row.cached_at,
      }
    },

    put(
      specVersion: string,
      specId: string,
      dataCollectionSpec: DataCollectionSpec,
      formSpec: FormSpec,
    ): void {
      db.run(
        'INSERT OR REPLACE INTO spec_snapshots (spec_version, spec_id, data_collection_spec, form_spec, cached_at) VALUES (?, ?, ?, ?, ?)',
        [
          specVersion,
          specId,
          JSON.stringify(dataCollectionSpec),
          JSON.stringify(formSpec),
          new Date().toISOString(),
        ],
      )
    },
  }
}
