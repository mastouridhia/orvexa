import type { Db } from '../db/index.js';
import { db as defaultDb } from '../db/index.js';
import { wrapDbError } from '../utils/db-error.js';

export abstract class BaseRepository {
  protected readonly db: Db;

  constructor(db: Db = defaultDb) {
    this.db = db;
  }

  protected async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction(async (tx) => fn(tx as unknown as Db));
    } catch (err) {
      throw wrapDbError(err);
    }
  }

  /** Wrap a single DB operation so Postgres errors become typed HttpErrors. */
  protected async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw wrapDbError(err);
    }
  }
}
