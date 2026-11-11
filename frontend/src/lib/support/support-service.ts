/**
 * LOOMERA — Customer Support & Service Desk Architecture
 * Manages customer service tickets, threaded conversations, SLA priorities,
 * and admin queue triage.
 */

import { eq, and, desc, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  supportTickets,
  supportMessages,
  orders,
  users,
} from "@/db/schema";
import { recordAdminAuditLog } from "@/lib/admin/audit";

export const SUPPORT_CATEGORIES = [
  "ORDER_STATUS",
  "DELIVERY",
  "RETURN_REFUND",
  "PRODUCT_INQUIRY",
  "ACCOUNT",
  "GENERAL",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export function generateTicketNumber(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TCK-${dateStr}-${randomSuffix}`;
}

export interface CreateTicketParams {
  userId: string;
  orderId?: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
  attachments?: Record<string, unknown>[];
}

/**
 * Creates a customer support ticket and records the initial message.
 */
export async function createCustomerSupportTicket(params: CreateTicketParams) {
  const { userId, orderId, category, subject, message, attachments } = params;

  if (!subject || subject.trim().length < 3) {
    throw new Error("Subject must be at least 3 characters");
  }
  if (!message || message.trim().length < 5) {
    throw new Error("Please describe your request in detail (at least 5 characters)");
  }

  return await db.transaction(async (tx) => {
    // If orderId provided, verify customer ownership
    if (orderId) {
      const [order] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!order) {
        throw new Error("Specified order does not belong to your account");
      }
    }

    const ticketNumber = generateTicketNumber();

    // Insert Ticket
    const [ticketRow] = await tx
      .insert(supportTickets)
      .values({
        ticketNumber,
        userId,
        orderId: orderId || null,
        category,
        subject: subject.trim(),
        status: "OPEN",
        priority: category === "DELIVERY" || category === "RETURN_REFUND" ? "HIGH" : "MEDIUM",
      })
      .returning();

    // Insert Initial Message
    await tx.insert(supportMessages).values({
      ticketId: ticketRow.id,
      senderId: userId,
      senderRole: "CUSTOMER",
      message: message.trim(),
      attachments: attachments ? attachments : null,
    });

    return ticketRow;
  });
}

/**
 * Retrieves all support tickets for a specific customer.
 */
export async function getCustomerSupportTickets(userId: string) {
  const tickets = await db
    .select({
      id: supportTickets.id,
      ticketNumber: supportTickets.ticketNumber,
      category: supportTickets.category,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      orderNumber: orders.orderNumber,
    })
    .from(supportTickets)
    .leftJoin(orders, eq(supportTickets.orderId, orders.id))
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt));

  return tickets;
}

/**
 * Retrieves full ticket thread with customer data isolation.
 */
export async function getSupportTicketDetails(ticketId: string, userId: string, isAdmin = false) {
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  if (!ticket) return null;

  // Strict ownership enforcement: patrons can only view their own tickets
  if (!isAdmin && ticket.userId !== userId) {
    throw new Error("Unauthorized to access this support ticket");
  }

  const messages = await db
    .select({
      id: supportMessages.id,
      senderId: supportMessages.senderId,
      senderRole: supportMessages.senderRole,
      message: supportMessages.message,
      attachments: supportMessages.attachments,
      createdAt: supportMessages.createdAt,
      senderName: users.fullName,
      senderEmail: users.email,
    })
    .from(supportMessages)
    .innerJoin(users, eq(supportMessages.senderId, users.id))
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(asc(supportMessages.createdAt));

  let orderData = null;
  if (ticket.orderId) {
    const [ord] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalInr: orders.totalInr,
      })
      .from(orders)
      .where(eq(orders.id, ticket.orderId))
      .limit(1);
    orderData = ord || null;
  }

  return {
    ...ticket,
    order: orderData,
    messages,
  };
}

/**
 * Adds a message to an existing support ticket thread.
 */
export async function addSupportMessage(params: {
  ticketId: string;
  senderId: string;
  senderRole: "CUSTOMER" | "ADMIN";
  message: string;
  attachments?: Record<string, unknown>[];
}) {
  const { ticketId, senderId, senderRole, message, attachments } = params;

  if (!message || message.trim().length === 0) {
    throw new Error("Message content cannot be empty");
  }

  return await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (senderRole === "CUSTOMER" && ticket.userId !== senderId) {
      throw new Error("Unauthorized: you cannot reply to another customer's ticket");
    }

    // Determine status update
    let nextStatus: SupportStatus = ticket.status as SupportStatus;
    if (senderRole === "CUSTOMER") {
      if (ticket.status === "WAITING_FOR_CUSTOMER" || ticket.status === "RESOLVED") {
        nextStatus = "IN_PROGRESS";
      }
    } else {
      // Admin reply
      nextStatus = "WAITING_FOR_CUSTOMER";
    }

    const [msgRow] = await tx
      .insert(supportMessages)
      .values({
        ticketId,
        senderId,
        senderRole,
        message: message.trim(),
        attachments: attachments || null,
      })
      .returning();

    await tx
      .update(supportTickets)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId));

    return msgRow;
  });
}

/**
 * Admin: lists support tickets with status, priority filtering and customer info.
 */
export async function getAdminSupportQueue(params: {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { status, priority, limit = 50, offset = 0 } = params;

  const conditions = [];
  if (status) conditions.push(eq(supportTickets.status, status));
  if (priority) conditions.push(eq(supportTickets.priority, priority));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const queue = await db
    .select({
      id: supportTickets.id,
      ticketNumber: supportTickets.ticketNumber,
      category: supportTickets.category,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      customerName: users.fullName,
      customerEmail: users.email,
      orderNumber: orders.orderNumber,
      messageCount: sql<number>`(SELECT count(*) FROM ${supportMessages} sm WHERE sm.ticket_id = ${supportTickets.id})::int`,
    })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .leftJoin(orders, eq(supportTickets.orderId, orders.id))
    .where(whereClause)
    .orderBy(desc(supportTickets.updatedAt))
    .limit(limit)
    .offset(offset);

  return queue;
}

/**
 * Admin: updates support ticket status, priority, or assignment.
 */
export async function updateAdminSupportTicket(params: {
  ticketId: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  assignedAdminId?: string | null;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { ticketId, status, priority, assignedAdminId, adminId, ipAddress } = params;

  return await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) throw new Error("Ticket not found");

    const updates: Partial<typeof supportTickets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedAdminId !== undefined) updates.assignedAdminId = assignedAdminId;

    const [updated] = await tx
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await recordAdminAuditLog({
      adminId,
      action: "SUPPORT_TICKET_UPDATED",
      resourceType: "SUPPORT_TICKET",
      resourceId: ticketId,
      previousState: { status: ticket.status, priority: ticket.priority },
      newState: updates,
      ipAddress,
    });

    return updated;
  });
}
