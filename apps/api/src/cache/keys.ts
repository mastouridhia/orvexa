export const TTL = {
  menu: 5 * 60, // 5 minutes — busted on any menu write
  restaurant: 10 * 60, // 10 minutes — busted on settings patch
} as const;

export const CacheKey = {
  menu: (restaurantId: string) => `menu:${restaurantId}`,
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
} as const;
