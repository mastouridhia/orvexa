export const restaurantRoom = (restaurantId: string): string => `restaurant:${restaurantId}`;
export const tableRoom = (tableId: string): string => `table:${tableId}`;
export const kitchenRoom = (restaurantId: string): string => `kitchen:${restaurantId}`;
export const waiterRoom = (restaurantId: string): string => `waiter:${restaurantId}`;
