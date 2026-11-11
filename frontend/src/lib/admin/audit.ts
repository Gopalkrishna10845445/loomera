/**
 * LOOMERA — Administrative Audit Logging Service
 * Records an immutable audit trail of all privileged administrative actions.
 */

import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, users } from "@/db/schema";

export interface RecordAuditLogParams {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Persists an administrative audit log entry to PostgreSQL.
 * Strips any sensitive credentials (passwords, secrets) from states before saving.
 */
export async function recordAdminAuditLog(params: RecordAuditLogParams): Promise<string> {
  const {
    adminId,
    action,
    resourceType,
    resourceId,
    previousState = null,
    newState = null,
    ipAddress = null,
  } = params;

  // Sanitize states to prevent secret leaks
  const cleanState = (st: Record<string, unknown> | null) => {
    if (!st || typeof st !== "object") return st;
    const cloned = { ...st };
    delete cloned.password;
    delete cloned.passwordHash;
    delete cloned.tokenHash;
    delete cloned.secret;
    return cloned;
  };

  const [inserted] = await db
    .insert(adminAuditLogs)
    .values({
      adminId,
      action,
      resourceType,
      resourceId,
      previousState: cleanState(previousState),
      newState: cleanState(newState),
      ipAddress,
    })
    .returning({ id: adminAuditLogs.id });

  return inserted.id;
}

export interface GetAuditLogsParams {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function getAdminAuditLogs(params: GetAuditLogsParams = {}) {
  const { resourceType, resourceId, action, limit = 50, offset = 0 } = params;

  const conditions = [];
  if (resourceType) {
    conditions.push(eq(adminAuditLogs.resourceType, resourceType));
  }
  if (resourceId) {
    conditions.push(eq(adminAuditLogs.resourceId, resourceId));
  }
  if (action) {
    conditions.push(eq(adminAuditLogs.action, action));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      adminEmail: users.email,
      adminName: users.fullName,
      action: adminAuditLogs.action,
      resourceType: adminAuditLogs.resourceType,
      resourceId: adminAuditLogs.resourceId,
      previousState: adminAuditLogs.previousState,
      newState: adminAuditLogs.newState,
      ipAddress: adminAuditLogs.ipAddress,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.adminId, users.id))
    .where(whereClause)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(adminAuditLogs)
    .where(whereClause);

  return {
    logs,
    total: countResult?.total || 0,
    limit,
    offset,
  };
}
