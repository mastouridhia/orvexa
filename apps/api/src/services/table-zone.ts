import type {
  CreateTableZoneRequest,
  ReorderTableZonesRequest,
  TableZone,
  UpdateTableZoneRequest,
} from '@orvexa/shared';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TableZoneRepository, type TableZoneRow } from '../repositories/table.js';

export function toTableZone(row: TableZoneRow): TableZone {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class TableZoneService {
  private readonly repo: TableZoneRepository;

  constructor(repo: TableZoneRepository = new TableZoneRepository()) {
    this.repo = repo;
  }

  async list(restaurantId: string): Promise<TableZone[]> {
    const rows = await this.repo.list(restaurantId);
    return rows.map(toTableZone);
  }

  async create(restaurantId: string, input: CreateTableZoneRequest): Promise<TableZone> {
    const nextSort = (await this.repo.maxSortOrder(restaurantId)) + 1;
    const row = await this.repo.create({
      restaurantId,
      name: input.name,
      sortOrder: nextSort,
    });
    return toTableZone(row);
  }

  async update(
    restaurantId: string,
    id: string,
    input: UpdateTableZoneRequest,
  ): Promise<TableZone> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Zone not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const row = await this.repo.update(id, input);
    if (!row) throw new NotFoundError('Zone not found');
    return toTableZone(row);
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Zone not found');
    if (existing.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    // tables.zone_id has ON DELETE SET NULL; affected tables fall back to "Unassigned" in the UI.
    await this.repo.delete(id);
  }

  async reorder(
    restaurantId: string,
    input: ReorderTableZonesRequest,
  ): Promise<TableZone[]> {
    const rows = await this.repo.reorder(restaurantId, input.zoneIds);
    return rows.map(toTableZone);
  }
}
