import ms, { type StringValue } from 'ms';
import type { CustomerSession, LanguageCode } from '@orvexa/shared';
import { config } from '../config.js';
import { UnauthorizedError } from '../utils/errors.js';
import { signCustomerSessionToken } from '../utils/jwt.js';
import {
  CustomerSessionRepository,
  type CustomerSessionRow,
} from '../repositories/customer-session.js';
import { TableRepository } from '../repositories/table.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCustomerSession(row: CustomerSessionRow, tableLabel: string): CustomerSession {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    tableLabel,
    tableDayTokenId: row.tableDayTokenId,
    locale: row.locale as LanguageCode,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export type OpenSessionResult = {
  session: CustomerSession;
  token: string;
};

export class CustomerSessionService {
  private readonly repo: CustomerSessionRepository;
  private readonly tables: TableRepository;

  constructor(
    repo: CustomerSessionRepository = new CustomerSessionRepository(),
    tables: TableRepository = new TableRepository(),
  ) {
    this.repo = repo;
    this.tables = tables;
  }

  private async tableLabel(tableId: string): Promise<string> {
    const row = await this.tables.findById(tableId);
    return row?.label ?? '';
  }

  async open(input: { qrToken: string; locale: LanguageCode }): Promise<OpenSessionResult> {
    // `qrToken` is the printed table's stable public slug. The daily rotation
    // happens internally so per-day analytics (orders, carts, sessions) keep
    // their FK to table_day_tokens unchanged.
    const table = await this.tables.findByPublicSlug(input.qrToken);
    if (!table) throw new UnauthorizedError('Invalid QR code');

    const dayToken = await this.tables.findOrCreateDayToken(
      table.restaurantId,
      table.id,
      todayIso(),
    );

    const ttlMs = ms(config.auth.sessionTtl as StringValue);
    const expiresAt = new Date(Date.now() + ttlMs);
    const absoluteExpiresAt = new Date(Date.now() + ttlMs * 2);
    const row = await this.repo.create({
      restaurantId: dayToken.restaurantId,
      tableId: dayToken.tableId,
      tableDayTokenId: dayToken.id,
      locale: input.locale,
      expiresAt,
      absoluteExpiresAt,
    });

    return { session: toCustomerSession(row, table.label), token: this.issueToken(row) };
  }

  async renewIfNeeded(sessionId: string): Promise<OpenSessionResult | null> {
    const row = await this.repo.findById(sessionId);
    if (!row) return null;

    const now = Date.now();
    if (row.expiresAt.getTime() <= now) return null;
    if (row.absoluteExpiresAt.getTime() <= now) return null;

    const label = await this.tableLabel(row.tableId);

    const msUntilExpiry = row.expiresAt.getTime() - now;
    const threshold = ms(config.auth.sessionRenewThreshold as StringValue);
    if (msUntilExpiry > threshold) {
      return { session: toCustomerSession(row, label), token: this.issueToken(row) };
    }

    const newExpiry = new Date(now + ms(config.auth.sessionTtl as StringValue));
    const updated = await this.repo.extendExpiry(sessionId, newExpiry);
    if (!updated) return null;
    return { session: toCustomerSession(updated, label), token: this.issueToken(updated) };
  }

  private issueToken(row: CustomerSessionRow): string {
    return signCustomerSessionToken({
      sid: row.id,
      rid: row.restaurantId,
      tid: row.tableId,
      locale: row.locale as LanguageCode,
    });
  }
}
