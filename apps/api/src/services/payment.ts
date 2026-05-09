import type {
  Currency,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Receipt,
  RecordPaymentRequest,
} from '@orvexa/shared';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { OrderRepository } from '../repositories/order.js';
import { PaymentRepository, type PaymentRow } from '../repositories/payment.js';
import { RestaurantRepository, type RestaurantRow } from '../repositories/restaurant.js';
import { rowToOrder } from './order.js';

const PAYABLE_STATUSES: OrderStatus[] = ['ready', 'served'];

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    orderId: row.orderId,
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    amountMillimes: row.amountMillimes,
    tipMillimes: row.tipMillimes,
    collectedByUserId: row.collectedByUserId ?? null,
    providerReference: row.providerReference ?? null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export type RecordPaymentResult = {
  order: Order;
  payment: Payment;
  fullyPaid: boolean;
};

export class PaymentService {
  constructor(
    private readonly orderRepo: OrderRepository = new OrderRepository(),
    private readonly paymentRepo: PaymentRepository = new PaymentRepository(),
    private readonly restaurantRepo: RestaurantRepository = new RestaurantRepository(),
  ) {}

  async record(input: {
    restaurantId: string;
    orderId: string;
    collectedByUserId: string;
    body: RecordPaymentRequest;
  }): Promise<RecordPaymentResult> {
    const order = await this.orderRepo.findFullById(input.orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.restaurantId !== input.restaurantId) throw new ForbiddenError('Wrong restaurant');
    if (!PAYABLE_STATUSES.includes(order.status as OrderStatus)) {
      throw new ConflictError(
        `Cannot take payment for order in '${order.status}' — must be 'ready' or 'served'`,
      );
    }
    if (order.paymentStatus === 'paid') {
      throw new ConflictError('Order is already fully paid');
    }

    const alreadyPaid = await this.paymentRepo.sumPaidForOrder(order.id);
    const remaining = order.totalMillimes - alreadyPaid.amount;
    const amount = input.body.amountMillimes ?? remaining;
    if (amount <= 0) throw new ValidationError('amountMillimes must be positive');
    if (amount > remaining) {
      throw new ValidationError(
        `amountMillimes (${amount}) exceeds remaining balance (${remaining})`,
      );
    }

    // Cash is collected at the table → settle immediately.
    // Card / mobile pay go through an external gateway → record as `pending` until
    // the gateway (or a waiter via /payments/:id/confirm) confirms the charge.
    const isCash = input.body.method === 'cash';
    const status: PaymentStatus = isCash ? 'paid' : 'pending';
    const paidAt = isCash ? new Date() : null;
    const providerReference = isCash ? null : `stub-${Date.now()}`;

    const paymentRow = await this.paymentRepo.create({
      restaurantId: order.restaurantId,
      orderId: order.id,
      method: input.body.method,
      status,
      amountMillimes: amount,
      tipMillimes: input.body.tipMillimes,
      collectedByUserId: input.collectedByUserId,
      providerReference,
      paidAt,
    });

    const newPaid = alreadyPaid.amount + (isCash ? amount : 0);
    const fullyPaid = isCash && newPaid >= order.totalMillimes;

    let updatedOrderRow = order;
    if (fullyPaid) {
      const next = await this.orderRepo.updateOrder(order.id, {
        paymentStatus: 'paid',
        paymentMethod: input.body.method,
      });
      if (next) updatedOrderRow = next;
    }

    return {
      order: rowToOrder(updatedOrderRow),
      payment: rowToPayment(paymentRow),
      fullyPaid,
    };
  }

  async confirm(input: {
    restaurantId: string;
    paymentId: string;
  }): Promise<RecordPaymentResult> {
    const payment = await this.paymentRepo.findById(input.paymentId);
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.restaurantId !== input.restaurantId) {
      throw new ForbiddenError('Wrong restaurant');
    }
    if (payment.status === 'paid') {
      throw new ConflictError('Payment is already paid');
    }
    if (payment.status !== 'pending') {
      throw new ConflictError(`Cannot confirm payment in '${payment.status}' state`);
    }

    const updatedPayment = await this.paymentRepo.update(payment.id, {
      status: 'paid',
      paidAt: new Date(),
    });
    if (!updatedPayment) throw new NotFoundError('Payment not found');

    const order = await this.orderRepo.findFullById(payment.orderId);
    if (!order) throw new NotFoundError('Order not found');

    const paid = await this.paymentRepo.sumPaidForOrder(order.id);
    const fullyPaid = paid.amount >= order.totalMillimes;

    let updatedOrderRow = order;
    if (fullyPaid && order.paymentStatus !== 'paid') {
      const next = await this.orderRepo.updateOrder(order.id, {
        paymentStatus: 'paid',
        paymentMethod: payment.method as PaymentMethod,
      });
      if (next) updatedOrderRow = next;
    }

    return {
      order: rowToOrder(updatedOrderRow),
      payment: rowToPayment(updatedPayment),
      fullyPaid,
    };
  }

  async getReceipt(restaurantId: string, orderId: string): Promise<Receipt> {
    const order = await this.orderRepo.findFullById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.restaurantId !== restaurantId) throw new ForbiddenError('Wrong restaurant');
    const restaurant = await this.restaurantRepo.findById(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    const paymentRows = await this.paymentRepo.listForOrder(orderId);
    return this.buildReceipt(restaurant, order, paymentRows);
  }

  async getReceiptForCustomer(sessionId: string, orderId: string): Promise<Receipt> {
    const order = await this.orderRepo.findFullById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.sessionId !== sessionId) throw new ForbiddenError('Order belongs to a different session');
    const restaurant = await this.restaurantRepo.findById(order.restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    const paymentRows = await this.paymentRepo.listForOrder(orderId);
    return this.buildReceipt(restaurant, order, paymentRows);
  }

  private buildReceipt(
    restaurant: RestaurantRow,
    orderRow: Parameters<typeof rowToOrder>[0],
    paymentRows: PaymentRow[],
  ): Receipt {
    const order = rowToOrder(orderRow);
    const payments = paymentRows.map(rowToPayment);
    const amountPaidMillimes = payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.amountMillimes, 0);
    const tipTotalMillimes = payments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.tipMillimes, 0);
    return {
      order,
      payments,
      amountPaidMillimes,
      amountDueMillimes: order.totalMillimes - amountPaidMillimes,
      tipTotalMillimes,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        currency: restaurant.currency as Currency,
        taxPercent: restaurant.taxPercent,
        servicePercent: restaurant.servicePercent,
        timezone: restaurant.timezone,
      },
    };
  }
}
