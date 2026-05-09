import type {
  Feedback,
  FeedbackSummary,
  LanguageCode,
  SubmitFeedbackRequest,
} from '@orvexa/shared';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors.js';
import { FeedbackRepository, type FeedbackRow } from '../repositories/feedback.js';
import { OrderRepository } from '../repositories/order.js';

function rowToFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId ?? null,
    orderId: row.orderId ?? null,
    sessionId: row.sessionId ?? null,
    rating: row.rating,
    comment: row.comment ?? null,
    locale: row.locale as LanguageCode,
    createdAt: row.createdAt.toISOString(),
  };
}

export class FeedbackService {
  private readonly repo: FeedbackRepository;
  private readonly orderRepo: OrderRepository;

  constructor(
    repo: FeedbackRepository = new FeedbackRepository(),
    orderRepo: OrderRepository = new OrderRepository(),
  ) {
    this.repo = repo;
    this.orderRepo = orderRepo;
  }

  async submitForOrder(input: {
    orderId: string;
    sessionId: string;
    locale: LanguageCode;
    body: SubmitFeedbackRequest;
  }): Promise<Feedback> {
    const order = await this.orderRepo.findFullById(input.orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.sessionId !== input.sessionId) {
      throw new ForbiddenError('Order belongs to a different session');
    }
    const existing = await this.repo.findByOrderId(input.orderId);
    if (existing) throw new ConflictError('Feedback already submitted for this order');
    const trimmed = input.body.comment?.trim();
    const created = await this.repo.create({
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      orderId: order.id,
      sessionId: input.sessionId,
      rating: input.body.rating,
      comment: trimmed && trimmed.length > 0 ? trimmed : null,
      locale: input.locale,
    });
    return rowToFeedback(created);
  }

  async list(
    restaurantId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: Feedback[]; total: number; page: number; pageSize: number }> {
    const { rows, total } = await this.repo.listByRestaurant(restaurantId, page, pageSize);
    return { rows: rows.map(rowToFeedback), total, page, pageSize };
  }

  async summary(restaurantId: string): Promise<FeedbackSummary> {
    const s = await this.repo.summary(restaurantId);
    return {
      count: s.count,
      averageRating: s.averageRating,
      ratingsBreakdown: s.breakdown,
    };
  }
}
