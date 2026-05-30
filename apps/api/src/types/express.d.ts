import type { Logger } from 'pino';
import type { StaffRole } from '@orvexa/shared';

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      user?: {
        id: string;
        restaurantId: string;
        role: StaffRole;
      };
      customerSession?: {
        id: string;
        restaurantId: string;
        tableId: string;
        tableDayTokenId: string;
        locale: 'ar' | 'fr' | 'en';
        presenceVerifiedAt: Date | null;
      };
    }
  }
}

export {};
