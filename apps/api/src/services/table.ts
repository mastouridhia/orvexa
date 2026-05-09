import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import type {
  BulkUpdateTableLayoutRequest,
  CreateTableRequest,
  Table,
  TableStatus,
  TableWithDerived,
  UpdateTableRequest,
} from '@orvexa/shared';
import { config } from '../config.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { OrderRepository, type OrderRow } from '../repositories/order.js';
import {
  TableRepository,
  TableZoneRepository,
  type TableRow,
} from '../repositories/table.js';
import {
  WaiterCallRepository,
  type WaiterCallRow,
} from '../repositories/waiter-call.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateToken(): string {
  return randomBytes(16).toString('base64url');
}

export function toTable(row: TableRow): Table {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    label: row.label,
    seats: row.seats,
    status: row.status as TableStatus,
    mergedIntoTableId: row.mergedIntoTableId ?? null,
    zoneId: row.zoneId ?? null,
    x: row.x ?? null,
    y: row.y ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function deriveStatus(
  stored: TableStatus,
  openCalls: WaiterCallRow[],
  activeOrders: OrderRow[],
): TableStatus {
  // Cleaning state is sticky — it overrides everything until a waiter clears it.
  if (stored === 'needs_cleaning') return 'needs_cleaning';
  if (openCalls.some((c) => c.kind === 'request_bill')) return 'needs_bill';
  if (openCalls.some((c) => c.kind === 'call_waiter')) return 'call_waiter';
  if (activeOrders.length > 0) return 'waiting';
  if (stored === 'free') return 'free';
  return stored;
}

export type QrFormat = 'png' | 'svg';

export type QrResult = {
  format: QrFormat;
  url: string;
  token: string;
  body: Buffer | string;
  contentType: string;
};

export class TableService {
  private readonly tableRepo: TableRepository;
  private readonly waiterCallRepo: WaiterCallRepository;
  private readonly orderRepo: OrderRepository;

  constructor(
    tableRepo: TableRepository = new TableRepository(),
    waiterCallRepo: WaiterCallRepository = new WaiterCallRepository(),
    orderRepo: OrderRepository = new OrderRepository(),
  ) {
    this.tableRepo = tableRepo;
    this.waiterCallRepo = waiterCallRepo;
    this.orderRepo = orderRepo;
  }

  async list(restaurantId: string): Promise<TableWithDerived[]> {
    const rows = await this.tableRepo.listForRestaurant(restaurantId);
    if (rows.length === 0) return [];
    const tableIds = rows.map((r) => r.id);
    const [calls, activeOrders] = await Promise.all([
      this.waiterCallRepo.listOpenForTables(tableIds),
      this.orderRepo.listActiveForTables(tableIds),
    ]);
    // Build mergedTableIds map: leader → [member ids]
    const membersByLeader = new Map<string, string[]>();
    for (const r of rows) {
      if (r.mergedIntoTableId) {
        const list = membersByLeader.get(r.mergedIntoTableId) ?? [];
        list.push(r.id);
        membersByLeader.set(r.mergedIntoTableId, list);
      }
    }
    return rows.map((row) => ({
      ...toTable(row),
      derivedStatus: deriveStatus(
        row.status as TableStatus,
        calls.filter((c) => c.tableId === row.id),
        activeOrders.filter((o) => o.tableId === row.id),
      ),
      mergedTableIds: membersByLeader.get(row.id) ?? [],
    }));
  }

  async deriveForTable(restaurantId: string, tableId: string): Promise<TableStatus | null> {
    const row = await this.tableRepo.findById(tableId);
    if (!row || row.restaurantId !== restaurantId) return null;
    const [calls, activeOrders] = await Promise.all([
      this.waiterCallRepo.listOpenForTables([tableId]),
      this.orderRepo.listActiveForTables([tableId]),
    ]);
    return deriveStatus(row.status as TableStatus, calls, activeOrders);
  }

  async mergeTables(input: {
    restaurantId: string;
    leaderId: string;
    memberTableIds: string[];
  }): Promise<{ leader: Table; members: Table[] }> {
    const leader = await this.tableRepo.findById(input.leaderId);
    if (!leader) throw new NotFoundError('Leader table not found');
    if (leader.restaurantId !== input.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    if (leader.mergedIntoTableId) {
      throw new ForbiddenError('Cannot merge into a table that is itself merged into another');
    }
    const updatedMembers: Table[] = [];
    for (const memberId of input.memberTableIds) {
      if (memberId === input.leaderId) continue;
      const member = await this.tableRepo.findById(memberId);
      if (!member) throw new NotFoundError(`Member table ${memberId} not found`);
      if (member.restaurantId !== input.restaurantId) {
        throw new ForbiddenError('Wrong restaurant on member table');
      }
      const updated = await this.tableRepo.update(memberId, {
        mergedIntoTableId: input.leaderId,
      });
      if (updated) updatedMembers.push(toTable(updated));
    }
    return { leader: toTable(leader), members: updatedMembers };
  }

  async unmergeTable(restaurantId: string, memberId: string): Promise<Table> {
    const member = await this.tableRepo.findById(memberId);
    if (!member) throw new NotFoundError('Table not found');
    if (member.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    if (!member.mergedIntoTableId) {
      throw new ForbiddenError('Table is not merged');
    }
    const updated = await this.tableRepo.update(memberId, { mergedIntoTableId: null });
    if (!updated) throw new NotFoundError('Table not found');
    return toTable(updated);
  }

  async create(restaurantId: string, input: CreateTableRequest): Promise<Table> {
    if (input.zoneId) {
      await this.assertZoneBelongsToRestaurant(restaurantId, input.zoneId);
    }
    const row = await this.tableRepo.create({ ...input, restaurantId });
    return toTable(row);
  }

  async update(
    restaurantId: string,
    id: string,
    input: UpdateTableRequest,
  ): Promise<Table> {
    const existing = await this.tableRepo.findById(id);
    if (!existing) throw new NotFoundError('Table not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    if (input.zoneId) {
      await this.assertZoneBelongsToRestaurant(restaurantId, input.zoneId);
    }
    const row = await this.tableRepo.update(id, input);
    if (!row) throw new NotFoundError('Table not found');
    return toTable(row);
  }

  async bulkUpdateLayout(
    restaurantId: string,
    input: BulkUpdateTableLayoutRequest,
  ): Promise<Table[]> {
    const ids = input.tables.map((t) => t.id);
    const existing = await this.tableRepo.findManyByIds(ids);
    if (existing.length !== ids.length) {
      throw new NotFoundError('One or more tables not found');
    }
    for (const row of existing) {
      if (row.restaurantId !== restaurantId) {
        throw new ForbiddenError('Wrong restaurant');
      }
    }
    const zoneIds = Array.from(
      new Set(input.tables.map((t) => t.zoneId).filter((z): z is string => z !== null)),
    );
    for (const zoneId of zoneIds) {
      await this.assertZoneBelongsToRestaurant(restaurantId, zoneId);
    }
    const rows = await this.tableRepo.bulkUpdateLayout(restaurantId, input.tables);
    return rows.map(toTable);
  }

  private async assertZoneBelongsToRestaurant(
    restaurantId: string,
    zoneId: string,
  ): Promise<void> {
    const zoneRepo = new TableZoneRepository();
    const zone = await zoneRepo.findById(zoneId);
    if (!zone) throw new NotFoundError('Zone not found');
    if (zone.restaurantId !== restaurantId) {
      throw new ForbiddenError('Wrong restaurant on zone');
    }
  }

  async markNeedsCleaning(restaurantId: string, tableId: string): Promise<Table> {
    const existing = await this.tableRepo.findById(tableId);
    if (!existing) throw new NotFoundError('Table not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const row = await this.tableRepo.update(tableId, { status: 'needs_cleaning' });
    if (!row) throw new NotFoundError('Table not found');
    return toTable(row);
  }

  async markClean(restaurantId: string, tableId: string): Promise<Table> {
    const existing = await this.tableRepo.findById(tableId);
    if (!existing) throw new NotFoundError('Table not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const row = await this.tableRepo.update(tableId, { status: 'free' });
    if (!row) throw new NotFoundError('Table not found');
    return toTable(row);
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    const existing = await this.tableRepo.findById(id);
    if (!existing) throw new NotFoundError('Table not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    await this.tableRepo.delete(id);
  }

  async qr(restaurantId: string, id: string, format: QrFormat): Promise<QrResult> {
    const table = await this.tableRepo.findById(id);
    if (!table) throw new NotFoundError('Table not found');
    if (table.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');

    const day = todayIso();
    let dayToken = await this.tableRepo.findDayToken(id, day);
    if (!dayToken) {
      dayToken = await this.tableRepo.createDayToken({
        restaurantId,
        tableId: id,
        day,
        token: generateToken(),
      });
    }

    const url = `${config.customer.appUrl}/t/${dayToken.token}`;

    if (format === 'svg') {
      const body = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 });
      return { format, url, token: dayToken.token, body, contentType: 'image/svg+xml' };
    }
    const body = await QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
    return { format, url, token: dayToken.token, body, contentType: 'image/png' };
  }

  async callWaiter(restaurantId: string, tableId: string): Promise<WaiterCallRow> {
    return this.recordCall(restaurantId, tableId, 'call_waiter');
  }

  async requestBill(restaurantId: string, tableId: string): Promise<WaiterCallRow> {
    return this.recordCall(restaurantId, tableId, 'request_bill');
  }

  async requestExtras(
    restaurantId: string,
    tableId: string,
    note: string,
  ): Promise<WaiterCallRow> {
    return this.recordCall(restaurantId, tableId, 'request_extras', note);
  }

  private async recordCall(
    restaurantId: string,
    tableId: string,
    kind: 'call_waiter' | 'request_bill' | 'request_extras',
    note?: string | null,
  ): Promise<WaiterCallRow> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new NotFoundError('Table not found');
    if (table.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    return this.waiterCallRepo.create({ restaurantId, tableId, kind, note: note ?? null });
  }
}
