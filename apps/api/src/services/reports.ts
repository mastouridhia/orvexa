import { and, desc, eq, gte, lt, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type {
  CategoryRevenueRow,
  DashboardSummary,
  LocalizedString,
  MenuAnalyticsSummary,
  ReportGranularity,
  SalesReportRow,
  TopItemRow,
} from '@orvexa/shared';
import { db } from '../db/index.js';
import { orders, orderItems, orderItemVariants } from '../db/schema/orders.js';
import { dishes, categories } from '../db/schema/menu.js';
import { tables } from '../db/schema/tables.js';
import { payments } from '../db/schema/payments.js';
import { waiterCalls } from '../db/schema/waiter-calls.js';
import { customerSessions } from '../db/schema/sessions.js';

const TERMINAL_FOR_REVENUE = ['served'] as const;
const ACTIVE_ORDER_STATUSES = ['received', 'preparing', 'ready'] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Pin both the granularity and the column reference via sql.raw so SELECT /
// GROUP BY / ORDER BY emit the identical expression tree — drizzle would emit
// `date_trunc($1, "created_at")` in SELECT but `"orders"."created_at"` in
// GROUP BY, and Postgres treats those as different expressions.
//
// '15min' uses date_bin (PG14+) anchored to midnight so buckets land on
// :00/:15/:30/:45. Other granularities use date_trunc via a safe lookup map.
const DATE_TRUNC_LITERAL: Record<Exclude<ReportGranularity, '15min'>, string> = {
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
};

function truncExpr(granularity: ReportGranularity) {
  if (granularity === '15min') {
    return sql<string>`date_bin('15 minutes', ${sql.raw('"orders"."created_at"')}, '2000-01-01'::timestamp)`;
  }
  const trunc = DATE_TRUNC_LITERAL[granularity];
  return sql<string>`date_trunc(${sql.raw(`'${trunc}'`)}, ${sql.raw('"orders"."created_at"')})`;
}

/** One day's headline numbers for the scheduled daily email report (35.2). */
export interface DailyReportSummary {
  ordersCount: number;
  salesMillimes: number;
  topItems: TopItemRow[];
  scans: number;
}

export class ReportsService {
  async sales(
    restaurantId: string,
    granularity: ReportGranularity,
    from?: Date,
    to?: Date,
  ): Promise<SalesReportRow[]> {
    const conditions = [
      eq(orders.restaurantId, restaurantId),
      inArray(orders.status, [...TERMINAL_FOR_REVENUE]),
    ];
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lt(orders.createdAt, to));

    const bucket = truncExpr(granularity);
    const rows = await db
      .select({
        bucket,
        orderCount: sql<number>`count(*)::int`,
        subtotalMillimes: sql<number>`coalesce(sum(${orders.subtotalMillimes}), 0)::int`,
        taxMillimes: sql<number>`coalesce(sum(${orders.taxMillimes}), 0)::int`,
        serviceMillimes: sql<number>`coalesce(sum(${orders.serviceMillimes}), 0)::int`,
        totalMillimes: sql<number>`coalesce(sum(${orders.totalMillimes}), 0)::int`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(bucket)
      .orderBy(bucket);

    return rows.map((r) => ({
      bucket: new Date(r.bucket as unknown as string | Date).toISOString(),
      orderCount: r.orderCount,
      subtotalMillimes: r.subtotalMillimes,
      taxMillimes: r.taxMillimes,
      serviceMillimes: r.serviceMillimes,
      totalMillimes: r.totalMillimes,
    }));
  }

  async topItems(
    restaurantId: string,
    limit: number,
    from?: Date,
    to?: Date,
  ): Promise<TopItemRow[]> {
    const conditions = [
      eq(orders.restaurantId, restaurantId),
      inArray(orders.status, [...TERMINAL_FOR_REVENUE]),
    ];
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lt(orders.createdAt, to));

    const variantTotals = db
      .select({
        orderItemId: orderItemVariants.orderItemId,
        delta: sql<number>`coalesce(sum(${orderItemVariants.priceDeltaMillimes}), 0)::int`.as(
          'delta',
        ),
      })
      .from(orderItemVariants)
      .groupBy(orderItemVariants.orderItemId)
      .as('variant_totals');

    const rows = await db
      .select({
        dishId: orderItems.dishId,
        nameAr: orderItems.nameSnapshotAr,
        nameFr: orderItems.nameSnapshotFr,
        nameEn: orderItems.nameSnapshotEn,
        quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenueMillimes: sql<number>`coalesce(sum((${orderItems.unitPriceMillimes} + coalesce(${variantTotals.delta}, 0)) * ${orderItems.quantity}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(variantTotals, eq(variantTotals.orderItemId, orderItems.id))
      .where(and(...conditions))
      .groupBy(
        orderItems.dishId,
        orderItems.nameSnapshotAr,
        orderItems.nameSnapshotFr,
        orderItems.nameSnapshotEn,
      )
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(limit);

    return rows.map<TopItemRow>((r) => ({
      dishId: r.dishId,
      name: { ar: r.nameAr, fr: r.nameFr, en: r.nameEn } as LocalizedString,
      quantity: r.quantity,
      revenueMillimes: r.revenueMillimes,
    }));
  }

  async revenueByCategory(
    restaurantId: string,
    from?: Date,
    to?: Date,
  ): Promise<CategoryRevenueRow[]> {
    const conditions = [
      eq(orders.restaurantId, restaurantId),
      inArray(orders.status, [...TERMINAL_FOR_REVENUE]),
    ];
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lt(orders.createdAt, to));

    const variantTotals = db
      .select({
        orderItemId: orderItemVariants.orderItemId,
        delta: sql<number>`coalesce(sum(${orderItemVariants.priceDeltaMillimes}), 0)::int`.as(
          'delta',
        ),
      })
      .from(orderItemVariants)
      .groupBy(orderItemVariants.orderItemId)
      .as('variant_totals');

    const rows = await db
      .select({
        categoryId: dishes.categoryId,
        nameAr: categories.nameAr,
        nameFr: categories.nameFr,
        nameEn: categories.nameEn,
        quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenueMillimes: sql<number>`coalesce(sum((${orderItems.unitPriceMillimes} + coalesce(${variantTotals.delta}, 0)) * ${orderItems.quantity}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(dishes, eq(dishes.id, orderItems.dishId))
      .leftJoin(categories, eq(categories.id, dishes.categoryId))
      .leftJoin(variantTotals, eq(variantTotals.orderItemId, orderItems.id))
      .where(and(...conditions))
      .groupBy(dishes.categoryId, categories.nameAr, categories.nameFr, categories.nameEn)
      .orderBy(
        desc(
          sql`coalesce(sum((${orderItems.unitPriceMillimes} + coalesce(${variantTotals.delta}, 0)) * ${orderItems.quantity}), 0)`,
        ),
      );

    return rows.map<CategoryRevenueRow>((r) => ({
      categoryId: r.categoryId ?? null,
      name: r.nameAr
        ? ({ ar: r.nameAr, fr: r.nameFr ?? '', en: r.nameEn ?? '' } as LocalizedString)
        : null,
      quantity: r.quantity,
      revenueMillimes: r.revenueMillimes,
    }));
  }

  /**
   * Essentiel-tier "basic analytics": QR scans (one customer session per scan) —
   * today's count, the rolling 7-day count, and a per-day activity series.
   */
  async menuAnalytics(restaurantId: string): Promise<MenuAnalyticsSummary> {
    const todayStart = startOfDay(new Date());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [todayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerSessions)
      .where(
        and(
          eq(customerSessions.restaurantId, restaurantId),
          gte(customerSessions.createdAt, todayStart),
          lt(customerSessions.createdAt, tomorrowStart),
        ),
      );

    const [weekRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerSessions)
      .where(
        and(
          eq(customerSessions.restaurantId, restaurantId),
          gte(customerSessions.createdAt, weekStart),
        ),
      );

    const dayBucket = sql<string>`date_trunc('day', ${sql.raw('"customer_sessions"."created_at"')})`;
    const activityRows = await db
      .select({ bucket: dayBucket, count: sql<number>`count(*)::int` })
      .from(customerSessions)
      .where(
        and(
          eq(customerSessions.restaurantId, restaurantId),
          gte(customerSessions.createdAt, weekStart),
        ),
      )
      .groupBy(dayBucket)
      .orderBy(dayBucket);

    // Fill the 7-day window so empty days render as zeros (stable x-axis).
    const counts = new Map<string, number>();
    for (const r of activityRows) {
      const key = new Date(r.bucket as unknown as string | Date).toISOString().slice(0, 10);
      counts.set(key, r.count);
    }
    const activity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      return { date: d.toISOString(), count: counts.get(key) ?? 0 };
    });

    return {
      scansToday: todayRow?.count ?? 0,
      scans7d: weekRow?.count ?? 0,
      activity,
    };
  }

  async dashboardSummary(restaurantId: string): Promise<DashboardSummary> {
    const todayStart = startOfDay(new Date());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [salesRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${orders.totalMillimes}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [...TERMINAL_FOR_REVENUE]),
          gte(orders.createdAt, todayStart),
          lt(orders.createdAt, tomorrowStart),
        ),
      );

    const [activeRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
        distinctTables: sql<number>`count(distinct ${orders.tableId})::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [...ACTIVE_ORDER_STATUSES]),
        ),
      );

    // Also treat tables with an open waiter_call as "active"
    const [openCallTablesRow] = await db
      .select({
        distinctTables: sql<number>`count(distinct ${waiterCalls.tableId})::int`,
      })
      .from(waiterCalls)
      .where(and(eq(waiterCalls.restaurantId, restaurantId), isNull(waiterCalls.clearedAt)));

    const [tablesRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId));

    const topItemsToday = await this.topItems(restaurantId, 5, todayStart, tomorrowStart);

    // Avg dwell = average minutes from order created_at to payment paid_at, for
    // today's orders that have been paid. Uses a subquery so we take the MAX
    // paid_at per order (split-bill orders may have multiple payment rows).
    const maxPaidAtSub = db
      .select({
        orderId: payments.orderId,
        maxPaidAt: sql<Date>`MAX(${payments.paidAt})`.as('max_paid_at'),
      })
      .from(payments)
      .where(and(eq(payments.status, 'paid'), isNotNull(payments.paidAt)))
      .groupBy(payments.orderId)
      .as('max_paid_at_sub');

    const [dwellRow] = await db
      .select({
        avgDwellMinutes: sql<number | null>`ROUND(AVG(EXTRACT(EPOCH FROM (${maxPaidAtSub.maxPaidAt} - ${orders.createdAt})) / 60))::int`,
      })
      .from(orders)
      .innerJoin(maxPaidAtSub, eq(maxPaidAtSub.orderId, orders.id))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          gte(orders.createdAt, todayStart),
          lt(orders.createdAt, tomorrowStart),
        ),
      );

    const avgDwellMinutesToday =
      dwellRow?.avgDwellMinutes != null ? Number(dwellRow.avgDwellMinutes) : null;

    // activeTablesCount = approx count of tables with an active order OR an open call
    // (conservative upper bound — double-counts a table that has both)
    const activeTablesCount = Math.min(
      (activeRow?.distinctTables ?? 0) + (openCallTablesRow?.distinctTables ?? 0),
      tablesRow?.count ?? 0,
    );

    return {
      salesTodayMillimes: salesRow?.total ?? 0,
      ordersTodayCount: salesRow?.count ?? 0,
      activeOrdersCount: activeRow?.count ?? 0,
      activeTablesCount,
      tablesTotal: tablesRow?.count ?? 0,
      topItemsToday,
      avgDwellMinutesToday,
    };
  }

  /**
   * Headline numbers for one day window `[from, to)` — used by the scheduled
   * daily email report (35.2). Revenue counts only revenue-terminal orders;
   * scans = customer sessions opened in the window (one per QR scan).
   */
  async dailySummary(restaurantId: string, from: Date, to: Date): Promise<DailyReportSummary> {
    const [salesRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${orders.totalMillimes}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [...TERMINAL_FOR_REVENUE]),
          gte(orders.createdAt, from),
          lt(orders.createdAt, to),
        ),
      );

    const [scanRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerSessions)
      .where(
        and(
          eq(customerSessions.restaurantId, restaurantId),
          gte(customerSessions.createdAt, from),
          lt(customerSessions.createdAt, to),
        ),
      );

    const topItems = await this.topItems(restaurantId, 5, from, to);

    return {
      ordersCount: salesRow?.count ?? 0,
      salesMillimes: salesRow?.total ?? 0,
      topItems,
      scans: scanRow?.count ?? 0,
    };
  }
}
