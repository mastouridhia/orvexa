import type { Db } from '../db/index.js';
import { db as defaultDb } from '../db/index.js';

export abstract class BaseRepository {
  protected readonly db: Db;

  constructor(db: Db = defaultDb) {
    this.db = db;
  }

  protected async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => fn(tx as unknown as Db));
  }
}
