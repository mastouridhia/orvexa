import type { CartItem } from '../db/schema/table-carts.js';
import { ConflictError, ForbiddenError } from '../utils/errors.js';
import { TableCartRepository, type TableCartRow } from '../repositories/table-cart.js';
import { CustomerSessionRepository } from '../repositories/customer-session.js';

export type TableCartView = {
  id: string;
  restaurantId: string;
  tableId: string;
  ownerSessionId: string;
  items: CartItem[];
  updatedAt: string;
};

function toView(row: TableCartRow): TableCartView {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    ownerSessionId: row.ownerSessionId,
    items: row.items,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class TableCartService {
  private readonly repo: TableCartRepository;
  private readonly sessionRepo: CustomerSessionRepository;

  constructor(
    repo: TableCartRepository = new TableCartRepository(),
    sessionRepo: CustomerSessionRepository = new CustomerSessionRepository(),
  ) {
    this.repo = repo;
    this.sessionRepo = sessionRepo;
  }

  /**
   * Resolves the open cart for a table; creates one if missing and assigns
   * the caller as the owner. If an existing cart belongs to a stale day-token
   * (a new day rotated the QR), it is reset and re-owned by the caller.
   */
  async getOrCreate(input: {
    restaurantId: string;
    tableId: string;
    tableDayTokenId: string;
    sessionId: string;
  }): Promise<TableCartView> {
    const existing = await this.repo.findByTableId(input.tableId);
    if (existing && existing.tableDayTokenId === input.tableDayTokenId) {
      return toView(existing);
    }
    if (existing) {
      await this.repo.deleteByTableId(input.tableId);
    }
    const created = await this.repo.create({
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      tableDayTokenId: input.tableDayTokenId,
      ownerSessionId: input.sessionId,
    });
    return toView(created);
  }

  /** Anyone in the same table day-token can replace items. */
  async setItems(input: {
    tableId: string;
    sessionId: string;
    items: CartItem[];
  }): Promise<TableCartView> {
    const existing = await this.repo.findByTableId(input.tableId);
    if (!existing) throw new ConflictError('No active cart for table');
    await this.assertSessionOnSameToken(input.sessionId, existing);
    const updated = await this.repo.updateItems(existing.id, input.items);
    if (!updated) throw new ConflictError('Failed to update cart');
    return toView(updated);
  }

  /** Owner-only clear (used after successful checkout). */
  async clear(input: { tableId: string; sessionId: string }): Promise<void> {
    const existing = await this.repo.findByTableId(input.tableId);
    if (!existing) return;
    if (existing.ownerSessionId !== input.sessionId) {
      throw new ForbiddenError('Only the cart owner can clear the cart');
    }
    await this.repo.deleteByTableId(input.tableId);
  }

  /** Throws ForbiddenError if the caller's session is not on the same day-token. */
  private async assertSessionOnSameToken(
    sessionId: string,
    cart: TableCartRow,
  ): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new ForbiddenError('Session not found');
    if (session.tableDayTokenId !== cart.tableDayTokenId) {
      throw new ForbiddenError('Session is for a different table day-token');
    }
  }

  async assertOwner(sessionId: string, tableId: string): Promise<void> {
    const cart = await this.repo.findByTableId(tableId);
    if (!cart) return; // No cart yet — nothing to gate.
    if (cart.ownerSessionId !== sessionId) {
      throw new ForbiddenError('Only the cart owner can perform this action');
    }
  }
}
