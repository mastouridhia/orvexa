import type {
  Currency,
  LanguageCode,
  OrderGateMode,
  PatchRestaurantRequest,
  PaymentPoint,
  Restaurant,
} from '@orvexa/shared';
import {
  RestaurantRepository,
  type RestaurantPatch,
  type RestaurantRow,
} from '../repositories/restaurant.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { isValidNetwork } from '../utils/net.js';
import { cacheGet, cacheSet, cacheDel } from '../cache/helpers.js';
import { CacheKey, TTL } from '../cache/keys.js';

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
    paymentPoint: row.paymentPoint as PaymentPoint,
    orderGateMode: row.orderGateMode as OrderGateMode,
    allowedNetworks: row.allowedNetworks,
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
    const key = CacheKey.restaurant(id);
    const cached = await cacheGet<Restaurant>(key);
    if (cached) return cached;

    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('Restaurant not found');
    const restaurant = toRestaurant(row);
    void cacheSet(key, restaurant, TTL.restaurant);
    return restaurant;
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
    if (input.paymentPoint !== undefined) patch.paymentPoint = input.paymentPoint;
    if (input.orderGateMode !== undefined) patch.orderGateMode = input.orderGateMode;
    if (input.allowedNetworks !== undefined) {
      const cleaned = input.allowedNetworks.map((n) => n.trim()).filter(Boolean);
      const invalid = cleaned.filter((n) => !isValidNetwork(n));
      if (invalid.length > 0) {
        throw new ValidationError(`Invalid network entries: ${invalid.join(', ')}`);
      }
      patch.allowedNetworks = cleaned;
    }

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }

    const row = await this.repo.update(id, patch);
    if (!row) throw new NotFoundError('Restaurant not found');
    void cacheDel(CacheKey.restaurant(id));
    return toRestaurant(row);
  }
}
