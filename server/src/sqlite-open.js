/**
 * Open SQLite via Node built-in node:sqlite (Node 22.5+). No native better-sqlite3 rebuild.
 */
import { DatabaseSync } from 'node:sqlite'

/**
 * @param {string} filePath
 * @param {{ readonly?: boolean }} [opts]
 */
export function openDatabase(filePath, opts = {}) {
  const db = new DatabaseSync(filePath, opts.readonly ? { readOnly: true } : {})
  db.exec('PRAGMA foreign_keys = ON')
  return db
}

/** @param {DatabaseSync} db @param {() => void} fn */
export function runTransaction(db, fn) {
  db.exec('BEGIN')
  try {
    fn()
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
