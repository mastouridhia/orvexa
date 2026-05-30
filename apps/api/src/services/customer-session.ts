import ms, { type StringValue } from 'ms';
import type { CustomerSession, LanguageCode, OrderGateMode } from '@orvexa/shared';
import { config } from '../config.js';
import { TableNotOpenError, UnauthorizedError, ValidationError } from '../utils/errors.js';
import { bumpAttempts, resetAttempts } from '../utils/rate-attempts.js';
import { ipInAllowedList } from '../utils/net.js';
import { signCustomerSessionToken } from '../utils/jwt.js';
import {
  CustomerSessionRepository,
  type CustomerSessionRow,
} from '../repositories/customer-session.js';
import { RestaurantRepository } from '../repositories/restaurant.js';
import { TableRepository } from '../repositories/table.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Brute-force guard on the table-code verify endpoint.
const MAX_CODE_ATTEMPTS = 5;
const CODE_ATTEMPT_WINDOW_SECONDS = 600;

function toCustomerSession(
  row: CustomerSessionRow,
  tableLabel: string,
  gateMode: OrderGateMode,
): CustomerSession {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    tableLabel,
    tableDayTokenId: row.tableDayTokenId,
    locale: row.locale as LanguageCode,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    orderGateMode: gateMode,
    presenceVerified: row.presenceVerifiedAt != null,
  };
}

export type OpenSessionResult = {
  session: CustomerSession;
  token: string;
};

export class CustomerSessionService {
  private readonly repo: CustomerSessionRepository;
  private readonly tables: TableRepository;
  private readonly restaurants: RestaurantRepository;

  constructor(
    repo: CustomerSessionRepository = new CustomerSessionRepository(),
    tables: TableRepository = new TableRepository(),
    restaurants: RestaurantRepository = new RestaurantRepository(),
  ) {
    this.repo = repo;
    this.tables = tables;
    this.restaurants = restaurants;
  }

  private async tableLabel(tableId: string): Promise<string> {
    const row = await this.tables.findById(tableId);
    return row?.label ?? '';
  }

  private async gateModeFor(restaurantId: string): Promise<OrderGateMode> {
    const row = await this.restaurants.findById(restaurantId);
    return (row?.orderGateMode as OrderGateMode | undefined) ?? 'off';
  }

  async open(input: { qrToken: string; locale: LanguageCode; clientIp?: string }): Promise<OpenSessionResult> {
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

    const gateMode = await this.gateModeFor(table.restaurantId);
    // Pre-verify presence for WiFi-based modes: if the customer's IP is already
    // on the allowed network at scan time, mark them verified immediately so the
    // app can unlock the menu without a round-trip later.
    let presenceVerifiedAt: Date | undefined;
    if (gateMode !== 'off' && input.clientIp) {
      const restaurant = await this.restaurants.findById(table.restaurantId);
      if (restaurant && ipInAllowedList(input.clientIp, restaurant.allowedNetworks)) {
        presenceVerifiedAt = new Date();
      }
    }

    const row = await this.repo.create({
      restaurantId: dayToken.restaurantId,
      tableId: dayToken.tableId,
      tableDayTokenId: dayToken.id,
      locale: input.locale,
      expiresAt,
      absoluteExpiresAt,
      presenceVerifiedAt,
    });
    return {
      session: toCustomerSession(row, table.label, gateMode),
      token: this.issueToken(row),
    };
  }

  async renewIfNeeded(sessionId: string): Promise<OpenSessionResult | null> {
    const row = await this.repo.findById(sessionId);
    if (!row) return null;

    const now = Date.now();
    if (row.expiresAt.getTime() <= now) return null;
    if (row.absoluteExpiresAt.getTime() <= now) return null;

    const [label, gateMode] = await Promise.all([
      this.tableLabel(row.tableId),
      this.gateModeFor(row.restaurantId),
    ]);

    const msUntilExpiry = row.expiresAt.getTime() - now;
    const threshold = ms(config.auth.sessionRenewThreshold as StringValue);
    if (msUntilExpiry > threshold) {
      return { session: toCustomerSession(row, label, gateMode), token: this.issueToken(row) };
    }

    const newExpiry = new Date(now + ms(config.auth.sessionTtl as StringValue));
    const updated = await this.repo.extendExpiry(sessionId, newExpiry);
    if (!updated) return null;
    return { session: toCustomerSession(updated, label, gateMode), token: this.issueToken(updated) };
  }

  /**
   * Verify the short code a waiter handed the guest. On success the session is
   * marked presence-verified so the ordering gate lets it through. Wrong codes
   * are counted; after MAX_CODE_ATTEMPTS the table's code is invalidated and the
   * waiter must issue a fresh one.
   */
  async verifyCode(sessionId: string, code: string): Promise<OpenSessionResult> {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new UnauthorizedError('Session not found');
    const now = Date.now();
    if (session.expiresAt.getTime() <= now || session.absoluteExpiresAt.getTime() <= now) {
      throw new UnauthorizedError('Session expired');
    }

    const table = await this.tables.findById(session.tableId);
    if (!table) throw new UnauthorizedError('Invalid session');

    const gateMode = await this.gateModeFor(session.restaurantId);

    // Idempotent: an already-verified session just succeeds.
    if (session.presenceVerifiedAt) {
      return { session: toCustomerSession(session, table.label, gateMode), token: this.issueToken(session) };
    }

    const codeActive =
      table.orderingCode != null &&
      (table.orderingCodeExpiresAt == null || table.orderingCodeExpiresAt.getTime() > now);
    if (!codeActive) {
      throw new TableNotOpenError('No active code for this table — ask your waiter for one');
    }

    if (table.orderingCode !== code) {
      const attemptsKey = `ordercode:attempts:${session.tableId}:${session.id}`;
      const attempts = await bumpAttempts(attemptsKey, CODE_ATTEMPT_WINDOW_SECONDS);
      if (attempts >= MAX_CODE_ATTEMPTS) {
        await this.tables.clearOrderingCode(session.tableId);
        await resetAttempts(attemptsKey);
        throw new TableNotOpenError('Too many incorrect attempts — ask your waiter for a new code');
      }
      throw new ValidationError('Incorrect code');
    }

    await resetAttempts(`ordercode:attempts:${session.tableId}:${session.id}`);
    const updated = await this.repo.markPresenceVerified(session.id);
    if (!updated) throw new UnauthorizedError('Session not found');
    return {
      session: toCustomerSession(updated, table.label, gateMode),
      token: this.issueToken(updated),
    };
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
