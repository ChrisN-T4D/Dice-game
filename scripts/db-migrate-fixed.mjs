#!/usr/bin/env node
/**
 * Apply SQL migrations and strip comment lines
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

const applied = new Set(
  db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
)

for (const file of files) {
  if (applied.has(file)) {
    console.log('skip', file)
    continue
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
  // Remove comment lines (starts with | or ||)
  const cleanSql = sql.replace(/^[\|]{1,2}.*$/gm, '').replace(/^\s+$/gm, '')
  db.exec(cleanSql)
  db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file)
  console.log('applied', file)
}

db.close()
console.log('Migrations complete:', dbPath)