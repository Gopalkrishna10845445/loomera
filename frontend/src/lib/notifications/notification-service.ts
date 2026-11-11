/**
 * LOOMERA — Unified Customer Notification & Preference Management Service
 * Manages multi-channel communication (Email, In-App, SMS/WhatsApp mock),
 * consent-driven marketing controls, and in-app notification inboxes.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  customerNotifications,
  notificationPreferences,
} from "@/db/schema";
import { sendTransactionalEmail, NotificationPayload, NotificationResult } from "./email";

/**
 * Retrieves a customer's communication preferences or initializes strict GDPR-compliant defaults
 * (Marketing emails disabled by default until explicit opt-in).
 */
export async function getCustomerNotificationPreferences(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      userId,
      orderUpdatesEmail: true,
      orderUpdatesSms: false,
      orderUpdatesWhatsapp: false,
      promotionalEmail: false, // Strict opt-in default
      promotionalSms: false,
      inAppAlerts: true,
    })
    .returning();

  return created;
}

/**
 * Updates a customer's notification preferences.
 */
export async function updateCustomerNotificationPreferences(
  userId: string,
  updates: Partial<typeof notificationPreferences.$inferInsert>
) {
  await getCustomerNotificationPreferences(userId); // Ensure row exists

  const [updated] = await db
    .update(notificationPreferences)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(notificationPreferences.userId, userId))
    .returning();

  return updated;
}

/**
 * Creates an in-app alert for the patron's dashboard.
 */
export async function createInAppAlert(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
}) {
  const { userId, type, title, message, orderId } = params;

  const [alert] = await db
    .insert(customerNotifications)
    .values({
      userId,
      type,
      title,
      message,
      orderId: orderId || null,
      isRead: false,
    })
    .returning();

  return alert;
}

/**
 * Retrieves unread and recent in-app notifications for a patron.
 */
export async function getCustomerInAppNotifications(userId: string) {
  const alerts = await db
    .select()
    .from(customerNotifications)
    .where(eq(customerNotifications.userId, userId))
    .orderBy(desc(customerNotifications.createdAt))
    .limit(30);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return { alerts, unreadCount };
}

/**
 * Marks an in-app notification as read with ownership validation.
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const [updated] = await db
    .update(customerNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(customerNotifications.id, notificationId),
        eq(customerNotifications.userId, userId)
      )
    )
    .returning();

  return updated;
}

/**
 * High-level notification dispatcher checking consent, sending transactional email,
 * and creating in-app alerts.
 */
export async function dispatchCustomerNotification(params: {
  userId: string;
  payload: NotificationPayload;
  isMarketing?: boolean;
}): Promise<{ emailResult?: NotificationResult; inAppAlertId?: string; consentSkipped?: boolean }> {
  const { userId, payload, isMarketing = false } = params;

  const prefs = await getCustomerNotificationPreferences(userId);

  // Enforce customer consent for promotional/marketing communications
  if (isMarketing && !prefs.promotionalEmail) {
    return { consentSkipped: true };
  }

  let emailResult: NotificationResult | undefined;
  if (prefs.orderUpdatesEmail || (isMarketing && prefs.promotionalEmail)) {
    emailResult = await sendTransactionalEmail(payload);
  }

  let inAppAlertId: string | undefined;
  if (prefs.inAppAlerts) {
    const alert = await createInAppAlert({
      userId,
      type: payload.type,
      title: `${payload.type.replace(/_/g, " ")}: ${payload.orderNumber}`,
      message: `Update regarding order ${payload.orderNumber}: ${payload.reason || "Status update"}`,
    });
    inAppAlertId = alert.id;
  }

  return { emailResult, inAppAlertId };
}
