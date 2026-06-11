import type { RequestHandler } from 'express';
import { RestaurantService } from '../services/restaurant.js';
import { NotOnPremisesError, TableNotOpenError, UnauthorizedError } from '../utils/errors.js';
import { ipInAllowedList } from '../utils/net.js';

const restaurantService = new RestaurantService();

/**
 * Ordering-access gate. The printed QR is static and public, so possessing it
 * is not proof the guest is at the table. Depending on the restaurant's
 * `orderGateMode`, require the request to come from the café network (`wifi`)
 * and/or carry a session that entered a valid waiter code (`code`). Applied to
 * customer order-placement routes only — staff routes bypass this.
 */
export const requirePresence: RequestHandler = async (req, _res, next) => {
  try {
    const session = req.customerSession;
    if (!session) return next(new UnauthorizedError('Customer session required'));

    const restaurant = await restaurantService.get(session.restaurantId);
    const mode = restaurant.orderGateMode;
    if (mode === 'off') return next();

    const verified = session.presenceVerifiedAt != null;
    // Already proved presence for this session — don't re-challenge on every order.
    if (verified) return next();

    const onWifi = ipInAllowedList(req.ip, restaurant.allowedNetworks);

    if (mode === 'wifi') {
      return onWifi ? next() : next(new NotOnPremisesError());
    }
    if (mode === 'code') {
      return next(new TableNotOpenError());
    }
    // wifi_or_code — either proof is enough. On failure prefer the code hint,
    // since a guest who isn't on the café WiFi can still ask the waiter.
    if (onWifi) return next();
    return next(
      new TableNotOpenError('Connect to the café Wi-Fi or ask your waiter for the table code'),
    );
  } catch (err) {
    next(err);
  }
};
