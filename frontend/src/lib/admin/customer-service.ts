/**
 * LOOMERA — Administrative Customer Management Service
 * Customer directories, spending history, account management, and privacy compliance.
 */

import { eq, desc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { users, orders, orderAddresses } from "@/db/schema";
import { recordAdminAuditLog } from "./audit";
import { UserRole } from "@/lib/auth/session";

export interface GetAdminCustomersParams {
  search?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves patron directory with aggregated lifetime spend and order count.
 */
export async function getAdminCustomers(params: GetAdminCustomersParams = {}) {
  const { search, role, limit = 50, offset = 0 } = params;

  const conditions = [];

  if (role) {
    conditions.push(eq(users.role, role));
  }

  if (search) {
    conditions.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? or(...conditions) : undefined;

  const customerRows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      orderCount: sql<number>`(SELECT count(*) FROM ${orders} o WHERE o.user_id = ${users.id})::int`,
      totalSpendInr: sql<number>`
        COALESCE(
          (
            SELECT SUM(o.total_inr)
            FROM ${orders} o
            WHERE o.user_id = ${users.id}
              AND o.status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
          ),
          0
        )::int
      `,
      lastOrderDate: sql<Date | null>`(SELECT max(o.created_at) FROM ${orders} o WHERE o.user_id = ${users.id})`,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(whereClause);

  return {
    customers: customerRows,
    total: countRow?.total || 0,
    limit,
    offset,
  };
}

/**
 * Retrieves a customer profile with historical order records and saved addresses.
 */
export async function getAdminCustomerById(userId: string) {
  const [customer] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!customer) return null;

  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalInr: orders.totalInr,
      itemCount: sql<number>`(SELECT count(*) FROM order_items oi WHERE oi.order_id = ${orders.id})::int`,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  const addresses = await db
    .select()
    .from(orderAddresses)
    .where(eq(orderAddresses.userId, userId))
    .orderBy(desc(orderAddresses.createdAt));

  return {
    ...customer,
    orders: customerOrders,
    addresses,
  };
}

/**
 * Updates a user's role (permitted ONLY for SUPER_ADMIN).
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  superAdminId: string,
  ipAddress?: string | null
) {
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new Error(`User not found: ${targetUserId}`);
  }

  // Prevent super_admin from demoting themselves to avoid lockouts
  if (targetUserId === superAdminId && newRole !== "SUPER_ADMIN") {
    throw new Error("Super Administrator cannot demote their own account.");
  }

  const [updated] = await db
    .update(users)
    .set({
      role: newRole,
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
    });

  await recordAdminAuditLog({
    adminId: superAdminId,
    action: "USER_ROLE_CHANGED",
    resourceType: "USER",
    resourceId: targetUserId,
    previousState: { role: target.role },
    newState: { role: newRole },
    ipAddress,
  });

  return updated;
}
