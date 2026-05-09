import type {
  Currency,
  LanguageCode,
  PatchRestaurantRequest,
  Restaurant,
} from '@orvexa/shared';
import {
  RestaurantRepository,
  type RestaurantPatch,
  type RestaurantRow,
} from '../repositories/restaurant.js';
import { NotFoundError } from '../utils/errors.js';

export function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    defaultLanguage: row.defaultLanguage as LanguageCode,
    supportedLanguages: row.supportedLanguages as [LanguageCode, ...LanguageCode[]],
    currency: row.currency as Currency,
    taxPercent: row.taxPercent,
    servicePercent: row.servicePercent,
    defaultPrepMinutes: row.defaultPrepMinutes,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class RestaurantService {
  private readonly repo: RestaurantRepository;

  constructor(repo: RestaurantRepository = new RestaurantRepository()) {
    this.repo = repo;
  }

  async get(id: string): Promise<Restaurant> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('Restaurant not found');
    return toRestaurant(row);
  }

  async patch(id: string, input: PatchRestaurantRequest): Promise<Restaurant> {
    const patch: RestaurantPatch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.defaultLanguage !== undefined) patch.defaultLanguage = input.defaultLanguage;
    if (input.supportedLanguages !== undefined) patch.supportedLanguages = input.supportedLanguages;
    if (input.taxPercent !== undefined) patch.taxPercent = input.taxPercent;
    if (input.servicePercent !== undefined) patch.servicePercent = input.servicePercent;
    if (input.defaultPrepMinutes !== undefined) patch.defaultPrepMinutes = input.defaultPrepMinutes;
    if (input.timezone !== undefined) patch.timezone = input.timezone;

    if (Object.keys(patch).length === 0) {
      const row = await this.repo.findById(id);
      if (!row) throw new NotFoundError('Restaurant not found');
      return toRestaurant(row);
    }

    const row = await this.repo.update(id, patch);
    if (!row) throw new NotFoundError('Restaurant not found');
    return toRestaurant(row);
  }
}
