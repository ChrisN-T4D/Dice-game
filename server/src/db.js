import path from 'path'
import { fileURLToPath } from 'url'
import { openDatabase } from './sqlite-open.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultPath = path.join(__dirname, '..', 'db', 'anatomy.sqlite')

let dbInstance = null

export function getDbPath() {
  return process.env.ANATOMY_DB_PATH || defaultPath
}

export function openDb() {
  if (dbInstance) return dbInstance
  dbInstance = openDatabase(getDbPath())
  return dbInstance
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/** Verify DB opens (call at API startup). */
export function assertDbReady() {
  const db = openDb()
  db.prepare('SELECT COUNT(*) AS n FROM zones').get()
  return true
}
