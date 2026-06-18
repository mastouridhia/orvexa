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
import QRCode from 'qrcode';
import { config } from '../config.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { isValidNetwork } from '../utils/net.js';
import { cacheGet, cacheSet, cacheDel } from '../cache/helpers.js';
import { CacheKey, TTL } from '../cache/keys.js';

export function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    plan: row.plan,
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
    orderCeiling: row.orderCeiling,
    perTableQr: row.perTableQr,
    extraTables: row.extraTables,
    address: row.address,
    mapUrl: row.mapUrl,
    phone: row.phone,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    tiktokUrl: row.tiktokUrl,
    wifiSsid: row.wifiSsid,
    wifiPassword: row.wifiPassword,
    openingHours: row.openingHours ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Restaurant info-card fields the owner edits; copied through verbatim on patch. */
const INFO_FIELDS = [
  'address',
  'mapUrl',
  'phone',
  'instagramUrl',
  'facebookUrl',
  'tiktokUrl',
  'wifiSsid',
  'wifiPassword',
  'openingHours',
] as const;

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
    if (input.orderCeiling !== undefined) patch.orderCeiling = input.orderCeiling;
    if (input.perTableQr !== undefined) patch.perTableQr = input.perTableQr;
    if (input.allowedNetworks !== undefined) {
      const cleaned = input.allowedNetworks.map((n) => n.trim()).filter(Boolean);
      const invalid = cleaned.filter((n) => !isValidNetwork(n));
      if (invalid.length > 0) {
        throw new ValidationError(`Invalid network entries: ${invalid.join(', ')}`);
      }
      patch.allowedNetworks = cleaned;
    }
    const infoPatch = patch as Record<string, unknown>;
    for (const field of INFO_FIELDS) {
      const value = input[field];
      if (value !== undefined) {
        // Normalize blank text to null so an emptied field is cleared, not stored as "".
        infoPatch[field] = typeof value === 'string' && value.trim() === '' ? null : value;
      }
    }

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }

    const row = await this.repo.update(id, patch);
    if (!row) throw new NotFoundError('Restaurant not found');
    void cacheDel(CacheKey.restaurant(id));
    return toRestaurant(row);
  }

  /**
   * QR for the shareable, view-only public menu (`/m/:slug`). Same artwork
   * conventions as the table QR so it prints consistently. Unlike the table QR,
   * this encodes a table-less link that never opens an ordering session.
   */
  async menuQr(
    id: string,
    format: 'png' | 'svg',
  ): Promise<{ url: string; body: Buffer | string; contentType: string }> {
    const restaurant = await this.get(id);
    const url = `${config.customer.appUrl}/m/${restaurant.slug}`;
    if (format === 'svg') {
      const body = await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'Q',
        margin: 1,
        color: { dark: '#19140E', light: '#00000000' },
      });
      return { url, body, contentType: 'image/svg+xml' };
    }
    const body = await QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'Q',
      margin: 1,
      width: 512,
    });
    return { url, body, contentType: 'image/png' };
  }
}
