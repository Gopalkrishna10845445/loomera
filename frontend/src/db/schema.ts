import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Categories Table
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    creativeDirection: text("creative_direction").notNull(),
    eyebrow: text("eyebrow").notNull(),
    headline: text("headline").notNull(),
    headlineBreak: text("headline_break"),
    description: text("description").notNull(),
    heroImage: text("hero_image").notNull(),
    heroImageAlt: text("hero_image_alt").notNull(),
    themeAccent: text("theme_accent").notNull().default("#264653"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("cat_slug_idx").on(table.slug)]
);

// 2. Products Master Table
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // Stable string ID matching mockData, e.g. "classic-linen-shirt"
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    basePriceInr: integer("base_price_inr").notNull(),
    originalPriceInr: integer("original_price_inr"),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "restrict" }),
    badge: text("badge").default(""),
    origin: text("origin"),
    weightGsm: text("weight_gsm"),
    fabricCare: text("fabric_care"),
    craftDetail: text("craft_detail"),
    displayOrder: integer("display_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    isArchived: boolean("is_archived").notNull().default(false),
    costPriceInr: integer("cost_price_inr"),
    supplierLeadTimeDays: integer("supplier_lead_time_days"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("prod_slug_idx").on(table.slug),
    uniqueIndex("prod_cat_idx").on(table.categorySlug, table.slug),
  ]
);

// 3. Product Variants Table (Size, Color, SKU, Stock)
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    size: text("size").notNull(),
    colorName: text("color_name").notNull(),
    colorHex: text("color_hex").notNull(),
    priceOverrideInr: integer("price_override_inr"),
    costPriceOverrideInr: integer("cost_price_override_inr"),
    stockQuantity: integer("stock_quantity").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sku_idx").on(table.sku),
    uniqueIndex("prod_size_color_idx").on(
      table.productId,
      table.size,
      table.colorName
    ),
  ]
);

// 4. Product Images Table
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    altText: text("alt_text").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("prod_img_idx").on(table.productId, table.imageUrl),
  ]
);

// 5. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("CUSTOMER"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

// 6. Sessions Table
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    uniqueIndex("sessions_user_id_idx").on(table.id, table.userId),
  ]
);

// 7. Carts Table (One cart per registered customer)
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("carts_user_id_idx").on(table.userId)]
);

// 8. Cart Items Table
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    color: text("color").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_item_unique_idx").on(
      table.cartId,
      table.productId,
      table.size,
      table.color
    ),
  ]
);

// 9. Wishlists Table (One wishlist per registered customer)
export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("wishlists_user_id_idx").on(table.userId)]
);

// 10. Wishlist Items Table
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlist_item_unique_idx").on(
      table.wishlistId,
      table.productId
    ),
  ]
);

// Drizzle Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categorySlug],
    references: [categories.slug],
  }),
  variants: many(productVariants),
  images: many(productImages),
  cartItems: many(cartItems),
  wishlistItems: many(wishlistItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  cart: one(carts, {
    fields: [users.id],
    references: [carts.userId],
  }),
  wishlist: one(wishlists, {
    fields: [users.id],
    references: [wishlists.userId],
  }),
  orders: many(orders),
  addresses: many(orderAddresses),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

// 11. Restock Records Table
export const restockRecords = pgTable(
  "restock_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    expectedRestockDate: timestamp("expected_restock_date", { withTimezone: true }),
    expectedQuantity: integer("expected_quantity").notNull().default(0),
    status: text("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("restock_records_variant_id_idx").on(table.variantId),
    index("restock_records_status_idx").on(table.status),
  ]
);

// 12. Restock Notifications Table
export const restockNotifications = pgTable(
  "restock_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (table) => [
    index("restock_notifications_user_id_idx").on(table.userId),
    index("restock_notifications_variant_id_idx").on(table.variantId),
  ]
);

// 13. Product View History Table
export const productViewHistory = pgTable(
  "product_view_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("view_history_user_viewed_at_idx").on(table.userId, table.viewedAt),
    index("view_history_session_viewed_at_idx").on(table.sessionId, table.viewedAt),
  ]
);

// 14. Search History Table
export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    searchQuery: text("search_query").notNull(),
    filtersJson: text("filters_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("search_history_user_created_at_idx").on(table.userId, table.createdAt),
    index("search_history_session_created_at_idx").on(table.sessionId, table.createdAt),
  ]
);

// Relations for new tables
export const restockRecordsRelations = relations(restockRecords, ({ one }) => ({
  variant: one(productVariants, {
    fields: [restockRecords.variantId],
    references: [productVariants.id],
  }),
}));

export const restockNotificationsRelations = relations(
  restockNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [restockNotifications.userId],
      references: [users.id],
    }),
    variant: one(productVariants, {
      fields: [restockNotifications.variantId],
      references: [productVariants.id],
    }),
  })
);

export const productViewHistoryRelations = relations(
  productViewHistory,
  ({ one }) => ({
    user: one(users, {
      fields: [productViewHistory.userId],
      references: [users.id],
    }),
    product: one(products, {
      fields: [productViewHistory.productId],
      references: [products.id],
    }),
  })
);

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// PHASE 4: CHECKOUT, ORDERS, PAYMENTS, RESERVATIONS & STATUS TIMELINE
// ============================================================================

// 15. Order Delivery Addresses Table
export const orderAddresses = pgTable(
  "order_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("India"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_addresses_user_id_idx").on(table.userId)]
);

// 16. Orders Master Table
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    shippingAddressId: uuid("shipping_address_id")
      .notNull()
      .references(() => orderAddresses.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("PENDING_PAYMENT"),
    subtotalInr: integer("subtotal_inr").notNull(),
    shippingFeeInr: integer("shipping_fee_inr").notNull().default(0),
    shippingMethod: text("shipping_method").notNull().default("standard"),
    discountInr: integer("discount_inr").notNull().default(0),
    taxInr: integer("tax_inr").notNull().default(0),
    totalInr: integer("total_inr").notNull(),
    currency: text("currency").notNull().default("INR"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ]
);

// 17. Order Items Table
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    productTitle: text("product_title").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    unitPriceInr: integer("unit_price_inr").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalInr: integer("line_total_inr").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

// 18. Payments Master Table
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    gateway: text("gateway").notNull().default("RAZORPAY"),
    gatewayOrderId: text("gateway_order_id").notNull(),
    gatewayPaymentId: text("gateway_payment_id"),
    gatewaySignature: text("gateway_signature"),
    amountInr: integer("amount_inr").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("CREATED"),
    errorCode: text("error_code"),
    errorDescription: text("error_description"),
    rawPayload: text("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_gateway_order_id_idx").on(table.gatewayOrderId),
  ]
);

// 19. Payment Events Table (Webhook Log & Idempotency)
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    gateway: text("gateway").notNull().default("RAZORPAY"),
    payload: text("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("payment_events_event_id_idx").on(table.eventId)]
);

// 20. Order Status History Timeline Table
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("order_status_history_order_id_idx").on(table.orderId)]
);

// 21. Inventory Reservations Table (Anti-overselling TTL lock)
export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("RESERVED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inventory_reservations_variant_id_idx").on(table.variantId),
    index("inventory_reservations_expires_at_idx").on(table.expiresAt),
  ]
);

// Relations for Phase 4 tables
export const orderAddressesRelations = relations(orderAddresses, ({ one, many }) => ({
  user: one(users, {
    fields: [orderAddresses.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  shippingAddress: one(orderAddresses, {
    fields: [orders.shippingAddressId],
    references: [orderAddresses.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  statusHistory: many(orderStatusHistory),
  reservations: many(inventoryReservations),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  order: one(orders, {
    fields: [inventoryReservations.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [inventoryReservations.variantId],
    references: [productVariants.id],
  }),
}));

// ============================================================================
// PHASE 5: ADMIN AUDIT LOGS, INVENTORY MOVEMENTS & INVENTORY SETTINGS
// ============================================================================

// 22. Admin Audit Logs Table
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    previousState: jsonb("previous_state"),
    newState: jsonb("new_state"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_admin_id").on(table.adminId),
    index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// 23. Inventory Movements Table
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
    movementType: text("movement_type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    previousQuantity: integer("previous_quantity").notNull(),
    newQuantity: integer("new_quantity").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_inventory_movements_variant").on(table.variantId),
    index("idx_inventory_movements_product").on(table.productId),
    index("idx_inventory_movements_created_at").on(table.createdAt),
  ]
);

// 24. Inventory Settings Table
export const inventorySettings = pgTable("inventory_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations for Phase 5 tables
export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminAuditLogs.adminId],
    references: [users.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventoryMovements.variantId],
    references: [productVariants.id],
  }),
  product: one(products, {
    fields: [inventoryMovements.productId],
    references: [products.id],
  }),
  admin: one(users, {
    fields: [inventoryMovements.adminId],
    references: [users.id],
  }),
}));

// ============================================================================
// PHASE 8: FULFILMENT, SHIPPING, RETURNS, COUPONS, LOYALTY, SUPPORT, MARKETING
// ============================================================================

// 25. Shipments Master Table
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text("carrier").notNull().default("DELHIVERY"),
    trackingNumber: text("tracking_number").notNull().unique(),
    labelUrl: text("label_url"),
    status: text("status").notNull().default("MANIFESTED"),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shipments_order_id").on(table.orderId),
    uniqueIndex("idx_shipments_tracking_number").on(table.trackingNumber),
    index("idx_shipments_status").on(table.status),
  ]
);

// 26. Shipment Events Table (Tracking Checkpoints)
export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    statusCode: text("status_code").notNull(),
    statusDescription: text("status_description").notNull(),
    location: text("location"),
    carrierEventTimestamp: timestamp("carrier_event_timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_shipment_events_shipment_id").on(table.shipmentId),
    index("idx_shipment_events_created_at").on(table.createdAt),
  ]
);

// 27. Return Requests Master Table
export const returnRequests = pgTable(
  "return_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnNumber: text("return_number").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("RETURN"), // "RETURN" | "EXCHANGE"
    status: text("status").notNull().default("REQUESTED"),
    reason: text("reason").notNull(),
    notes: text("notes"),
    inspectionNotes: text("inspection_notes"),
    refundAmountInr: integer("refund_amount_inr").notNull().default(0),
    refundStatus: text("refund_status").notNull().default("NONE"),
    exchangeVariantId: uuid("exchange_variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_return_requests_return_number").on(table.returnNumber),
    index("idx_return_requests_order_id").on(table.orderId),
    index("idx_return_requests_user_id").on(table.userId),
    index("idx_return_requests_status").on(table.status),
  ]
);

// 28. Return Items Table
export const returnItems = pgTable(
  "return_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnRequestId: uuid("return_request_id")
      .notNull()
      .references(() => returnRequests.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    condition: text("condition").default("UNOPENED"),
    inspectionPassed: boolean("inspection_passed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_return_items_request_id").on(table.returnRequestId)]
);

// 29. Coupons Master Table
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    description: text("description").notNull(),
    discountType: text("discount_type").notNull(), // "PERCENTAGE" | "FIXED_AMOUNT"
    discountValue: integer("discount_value").notNull(),
    minOrderValueInr: integer("min_order_value_inr").notNull().default(0),
    maxDiscountInr: integer("max_discount_inr"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    perCustomerLimit: integer("per_customer_limit").notNull().default(1),
    applicableCategorySlug: text("applicable_category_slug"),
    applicableProductId: text("applicable_product_id"),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_coupons_code").on(table.code),
    index("idx_coupons_is_active").on(table.isActive),
  ]
);

// 30. Coupon Redemptions Table
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    discountAmountInr: integer("discount_amount_inr").notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_coupon_redemptions_coupon_id").on(table.couponId),
    index("idx_coupon_redemptions_user_coupon").on(table.userId, table.couponId),
    index("idx_coupon_redemptions_order_id").on(table.orderId),
  ]
);

// 31. Loyalty Accounts Master Table
export const loyaltyAccounts = pgTable(
  "loyalty_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: text("tier").notNull().default("SILVER"),
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimePointsEarned: integer("lifetime_points_earned").notNull().default(0),
    lifetimePointsRedeemed: integer("lifetime_points_redeemed").notNull().default(0),
    referralCode: text("referral_code").notNull().unique(),
    referredByUserId: uuid("referred_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_loyalty_accounts_user_id").on(table.userId),
    uniqueIndex("idx_loyalty_accounts_referral_code").on(table.referralCode),
  ]
);

// 32. Loyalty Transactions Table (Points Ledger)
export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => loyaltyAccounts.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    pointsDelta: integer("points_delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_loyalty_tx_account_id").on(table.accountId),
    index("idx_loyalty_tx_created_at").on(table.createdAt),
  ]
);

// 33. Customer Support Tickets Table
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: text("ticket_number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    category: text("category").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("OPEN"),
    priority: text("priority").notNull().default("MEDIUM"),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_support_tickets_ticket_number").on(table.ticketNumber),
    index("idx_support_tickets_user_id").on(table.userId),
    index("idx_support_tickets_order_id").on(table.orderId),
    index("idx_support_tickets_status").on(table.status),
    index("idx_support_tickets_priority").on(table.priority),
  ]
);

// 34. Customer Support Messages Table
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderRole: text("sender_role").notNull().default("CUSTOMER"),
    message: text("message").notNull(),
    attachments: jsonb("attachments"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_support_messages_ticket_id").on(table.ticketId),
    index("idx_support_messages_created_at").on(table.createdAt),
  ]
);

// 35. Customer Notifications Table
export const customerNotifications = pgTable(
  "customer_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_customer_notifications_user_id").on(table.userId),
    index("idx_customer_notifications_is_read").on(table.isRead),
  ]
);

// 36. Notification Preferences Table
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    orderUpdatesEmail: boolean("order_updates_email").notNull().default(true),
    orderUpdatesSms: boolean("order_updates_sms").notNull().default(false),
    orderUpdatesWhatsapp: boolean("order_updates_whatsapp").notNull().default(false),
    promotionalEmail: boolean("promotional_email").notNull().default(false),
    promotionalSms: boolean("promotional_sms").notNull().default(false),
    inAppAlerts: boolean("in_app_alerts").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_notif_pref_user_id").on(table.userId)]
);

// 37. Marketing Campaigns Table
export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    headline: text("headline").notNull(),
    bannerText: text("banner_text").notNull(),
    ctaText: text("cta_text").notNull(),
    ctaLink: text("cta_link").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_campaigns_code").on(table.code),
    index("idx_campaigns_is_active").on(table.isActive),
  ]
);

// Relations for Phase 8 tables
export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  events: many(shipmentEvents),
}));

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentEvents.shipmentId],
    references: [shipments.id],
  }),
}));

export const returnRequestsRelations = relations(returnRequests, ({ one, many }) => ({
  order: one(orders, {
    fields: [returnRequests.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [returnRequests.userId],
    references: [users.id],
  }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  request: one(returnRequests, {
    fields: [returnItems.returnRequestId],
    references: [returnRequests.id],
  }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponRedemptions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [couponRedemptions.orderId],
    references: [orders.id],
  }),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [loyaltyAccounts.userId],
    references: [users.id],
  }),
  transactions: many(loyaltyTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  account: one(loyaltyAccounts, {
    fields: [loyaltyTransactions.accountId],
    references: [loyaltyAccounts.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [supportTickets.orderId],
    references: [orders.id],
  }),
  assignedAdmin: one(users, {
    fields: [supportTickets.assignedAdminId],
    references: [users.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
  }),
}));

export const customerNotificationsRelations = relations(customerNotifications, ({ one }) => ({
  user: one(users, {
    fields: [customerNotifications.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [customerNotifications.orderId],
    references: [orders.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// ==============================================================================
// PHASE 9: Growth, Attribution, Cart Recovery, Experimentation & Analytics
// ==============================================================================

// 38. Campaign Attributions Table
export const campaignAttributions = pgTable(
  "campaign_attributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    referrerUrl: text("referrer_url"),
    landingPage: text("landing_page"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_campaign_attr_order_id").on(table.orderId),
    index("idx_campaign_attr_session_id").on(table.sessionId),
    index("idx_campaign_attr_visitor_id").on(table.visitorId),
    index("idx_campaign_attr_utm_source").on(table.utmSource),
    index("idx_campaign_attr_utm_campaign").on(table.utmCampaign),
    index("idx_campaign_attr_created_at").on(table.createdAt),
  ]
);

// 39. Cart Recovery Events Table
export const cartRecoveryEvents = pgTable(
  "cart_recovery_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    recoveryToken: text("recovery_token").notNull().unique(),
    cartTotalInr: integer("cart_total_inr").notNull().default(0),
    itemCount: integer("item_count").notNull().default(0),
    discountCodeOffered: text("discount_code_offered"),
    status: text("status").notNull().default("REMINDED"),
    remindedAt: timestamp("reminded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    recoveredOrderId: uuid("recovered_order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cart_recovery_token").on(table.recoveryToken),
    index("idx_cart_recovery_cart_id").on(table.cartId),
    index("idx_cart_recovery_email").on(table.customerEmail),
    index("idx_cart_recovery_status").on(table.status),
  ]
);

// 40. Experiments Master Table
export const experiments = pgTable(
  "experiments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    variants: jsonb("variants").notNull().$type<string[]>(),
    trafficAllocationPercent: integer("traffic_allocation_percent").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_experiments_is_active").on(table.isActive)]
);

// 41. Experiment Assignments Table
export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    variant: text("variant").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_exp_assign_exp_id").on(table.experimentId),
    index("idx_exp_assign_visitor").on(table.visitorId),
  ]
);

// 42. First-Party Analytics Events Table
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: text("session_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    eventName: text("event_name").notNull(),
    eventData: jsonb("event_data").notNull().default({}),
    pageUrl: text("page_url"),
    referrerUrl: text("referrer_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_analytics_event_name").on(table.eventName),
    index("idx_analytics_visitor_id").on(table.visitorId),
    index("idx_analytics_session_id").on(table.sessionId),
    index("idx_analytics_created_at").on(table.createdAt),
  ]
);

// Phase 9 Relations
export const campaignAttributionsRelations = relations(campaignAttributions, ({ one }) => ({
  order: one(orders, {
    fields: [campaignAttributions.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [campaignAttributions.userId],
    references: [users.id],
  }),
}));

export const cartRecoveryEventsRelations = relations(cartRecoveryEvents, ({ one }) => ({
  cart: one(carts, {
    fields: [cartRecoveryEvents.cartId],
    references: [carts.id],
  }),
  user: one(users, {
    fields: [cartRecoveryEvents.userId],
    references: [users.id],
  }),
  recoveredOrder: one(orders, {
    fields: [cartRecoveryEvents.recoveredOrderId],
    references: [orders.id],
  }),
}));

export const experimentsRelations = relations(experiments, ({ many }) => ({
  assignments: many(experimentAssignments),
}));

export const experimentAssignmentsRelations = relations(experimentAssignments, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentAssignments.experimentId],
    references: [experiments.id],
  }),
  user: one(users, {
    fields: [experimentAssignments.userId],
    references: [users.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

// ==============================================================================
// PHASE 10: AUTONOMOUS BUSINESS INTELLIGENCE & PREDICTIVE ANALYTICS TABLES
// ==============================================================================

// 43. Demand Forecasts Master Table
export const demandForecasts = pgTable(
  "demand_forecasts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(), // 'PRODUCT', 'CATEGORY', 'STORE'
    targetId: text("target_id").notNull(),
    forecastDate: timestamp("forecast_date", { withTimezone: true }).notNull(),
    horizonDays: integer("horizon_days").notNull(),
    predictedUnits: integer("predicted_units").notNull(),
    predictedRevenueInr: integer("predicted_revenue_inr").notNull(),
    confidenceLower: integer("confidence_lower").notNull(),
    confidenceUpper: integer("confidence_upper").notNull(),
    confidenceLevel: text("confidence_level").notNull().default("80%"),
    modelUsed: text("model_used").notNull(),
    dataPointsCount: integer("data_points_count").notNull().default(0),
    limitations: text("limitations"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_demand_forecasts_target").on(table.targetType, table.targetId),
    index("idx_demand_forecasts_date").on(table.forecastDate),
    index("idx_demand_forecasts_created_at").on(table.createdAt),
  ]
);

// 44. Forecast Evaluations Table
export const forecastEvaluations = pgTable(
  "forecast_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    forecastId: uuid("forecast_id")
      .notNull()
      .references(() => demandForecasts.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    actualUnits: integer("actual_units").notNull(),
    forecastUnits: integer("forecast_units").notNull(),
    mae: numeric("mae", { precision: 10, scale: 2 }).notNull(),
    rmse: numeric("rmse", { precision: 10, scale: 2 }).notNull(),
    mapePercent: numeric("mape_percent", { precision: 10, scale: 2 }),
    bias: numeric("bias", { precision: 10, scale: 2 }).notNull(),
    evaluationPeriodStart: timestamp("evaluation_period_start", { withTimezone: true }).notNull(),
    evaluationPeriodEnd: timestamp("evaluation_period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_forecast_eval_forecast_id").on(table.forecastId),
    index("idx_forecast_eval_target").on(table.targetType, table.targetId),
  ]
);

// 45. Business Anomalies Table
export const businessAnomalies = pgTable(
  "business_anomalies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    anomalyType: text("anomaly_type").notNull(),
    severity: text("severity").notNull().default("MEDIUM"), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    metricName: text("metric_name").notNull(),
    currentValue: numeric("current_value", { precision: 14, scale: 2 }).notNull(),
    baselineValue: numeric("baseline_value", { precision: 14, scale: 2 }).notNull(),
    deviationPercent: numeric("deviation_percent", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("DETECTED"), // 'DETECTED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'
    summary: text("summary").notNull(),
    supportingData: jsonb("supporting_data").notNull().default({}),
    suggestedInvestigation: text("suggested_investigation").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_business_anomalies_type").on(table.anomalyType),
    index("idx_business_anomalies_status").on(table.status),
    index("idx_business_anomalies_severity").on(table.severity),
    index("idx_business_anomalies_detected_at").on(table.detectedAt),
  ]
);

// 46. Business Recommendations Table
export const businessRecommendations = pgTable(
  "business_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    recommendation: text("recommendation").notNull(),
    supportingEvidence: text("supporting_evidence").notNull(),
    expectedImpact: text("expected_impact").notNull(),
    confidenceScore: integer("confidence_score").notNull().default(85),
    priority: text("priority").notNull().default("MEDIUM"),
    targetType: text("target_type").notNull().default("GENERAL"),
    targetId: text("target_id").notNull().default("STORE"),
    actionType: text("action_type").notNull(),
    actionPayload: jsonb("action_payload").notNull().default({}),
    status: text("status").notNull().default("PENDING_APPROVAL"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_recommendations_category").on(table.category),
    index("idx_recommendations_status").on(table.status),
    index("idx_recommendations_priority").on(table.priority),
    index("idx_recommendations_created_at").on(table.createdAt),
  ]
);

// 47. Scheduled Report Runs Table
export const scheduledReportRuns = pgTable(
  "scheduled_report_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportType: text("report_type").notNull(), // 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("GENERATED"),
    summary: jsonb("summary").notNull().default({}),
    metrics: jsonb("metrics").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_scheduled_reports_type").on(table.reportType),
    index("idx_scheduled_reports_created_at").on(table.createdAt),
  ]
);

// 48. Intelligence Job Runs Table
export const intelligenceJobRuns = pgTable(
  "intelligence_job_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(), // 'RUNNING', 'COMPLETED', 'FAILED'
    itemsProcessed: integer("items_processed").notNull().default(0),
    anomaliesFound: integer("anomalies_found").notNull().default(0),
    recommendationsCreated: integer("recommendations_created").notNull().default(0),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_intel_job_name").on(table.jobName),
    index("idx_intel_job_status").on(table.status),
    index("idx_intel_job_started_at").on(table.startedAt),
  ]
);

// Phase 10 Relations
export const demandForecastsRelations = relations(demandForecasts, ({ many }) => ({
  evaluations: many(forecastEvaluations),
}));

export const forecastEvaluationsRelations = relations(forecastEvaluations, ({ one }) => ({
  forecast: one(demandForecasts, {
    fields: [forecastEvaluations.forecastId],
    references: [demandForecasts.id],
  }),
}));

export const businessRecommendationsRelations = relations(businessRecommendations, ({ one }) => ({
  reviewer: one(users, {
    fields: [businessRecommendations.reviewedBy],
    references: [users.id],
  }),
}));



