#!/usr/bin/env node
/**
 * Apply SQL migrations in server/db/migrations/ to server/db/anatomy.sqlite
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { openDatabase } from '../server/src/sqlite-open.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dbPath = path.join(root, 'server', 'db', 'anatomy.sqlite')
const migrationsDir = path.join(root, 'server', 'db', 'migrations')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = openDatabase(dbPath)

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const applied = new Set(
  db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
)

for (const file of files) {
  if (applied.has(file)) {
    console.log('skip', file)
    continue
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  db.exec(sql)
  db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file)
  console.log('applied', file)
}

db.close()
console.log('Migrations complete:', dbPath)
