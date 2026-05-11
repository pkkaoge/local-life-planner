import { pgTable, unique, text, serial, timestamp, index, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	phone: text().notNull(),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
}, (table) => [
	unique("users_phone_key").on(table.phone),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const smsCodes = pgTable("sms_codes", {
	id: text().primaryKey().notNull(),
	phone: text().notNull(),
	codeHash: text("code_hash").notNull(),
	expiresAt: text("expires_at").notNull(),
	usedAt: text("used_at"),
	createdAt: text("created_at").notNull(),
}, (table) => [
	index("idx_sms_codes_phone_created").using("btree", table.phone.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
]);

export const subscriptions = pgTable("subscriptions", {
	userId: text("user_id").primaryKey().notNull(),
	status: text().notNull(),
	plan: text(),
	paidUntil: text("paid_until"),
	provider: text(),
	providerRef: text("provider_ref"),
	updatedAt: text("updated_at").notNull(),
});

export const userSettings = pgTable("user_settings", {
	userId: text("user_id").primaryKey().notNull(),
	data: text().notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const paymentOrders = pgTable("payment_orders", {
	id: text().primaryKey().notNull(),
	orderNo: text("order_no").notNull(),
	userId: text("user_id").notNull(),
	status: text().notNull(),
	provider: text().notNull(),
	amountCents: integer("amount_cents").notNull(),
	plan: text().notNull(),
	providerRef: text("provider_ref"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
}, (table) => [
	unique("payment_orders_order_no_key").on(table.orderNo),
]);

export const shops = pgTable("shops", {
	id: text().notNull(),
	userId: text("user_id").notNull(),
	data: text().notNull(),
	scheduledDate: text("scheduled_date"),
	status: text(),
	orderIndex: integer("order_index"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
}, (table) => [
	index("idx_shops_user_date").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.scheduledDate.asc().nullsLast().op("int4_ops"), table.orderIndex.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.id, table.userId], name: "shops_pkey"}),
]);
