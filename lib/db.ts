import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const runtimeDir = process.env.DATA_DIR || path.join(process.cwd(), 'runtime');
export class Store {
  readonly db: DatabaseSync;
  constructor(filename = path.join(runtimeDir, 'operations.sqlite')) {
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)), PRIMARY KEY(collection,id));
      CREATE TABLE IF NOT EXISTS audit (sequence INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL CHECK(json_valid(body)));
      CREATE INDEX IF NOT EXISTS record_status ON records(collection,json_extract(body,'$.status'));`);
  }
  get<T>(collection: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT body FROM records WHERE collection=? AND id=?').get(collection, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) as T : undefined;
  }
  all<T>(collection: string): T[] {
    return (this.db.prepare('SELECT body FROM records WHERE collection=? ORDER BY rowid').all(collection) as { body: string }[]).map(row => JSON.parse(row.body) as T);
  }
  put<T>(collection: string, id: string, value: T) {
    this.db.prepare('INSERT INTO records(collection,id,body) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET body=excluded.body').run(collection,id,JSON.stringify(value));
  }
  append(value: unknown) { this.db.prepare('INSERT INTO audit(body) VALUES(?)').run(JSON.stringify(value)); }
  audit<T>(): T[] { return (this.db.prepare('SELECT body FROM audit ORDER BY sequence DESC').all() as { body: string }[]).map(r => JSON.parse(r.body) as T); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
let singleton: Store | undefined;
export function store() { return singleton ??= new Store(); }
