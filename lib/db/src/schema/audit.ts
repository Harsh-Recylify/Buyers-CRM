import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  description: text("description").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginLogsTable = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"), // success | failed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("Recyclify Bidder Market"),
  appLogo: text("app_logo"),
  primaryColor: text("primary_color").notNull().default("#118847"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  currency: text("currency").notNull().default("INR"),
  emailNotifications: text("email_notifications").notNull().default("true"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });
export const insertLoginLogSchema = createInsertSchema(loginLogsTable).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type LoginLog = typeof loginLogsTable.$inferSelect;
export type AppSettings = typeof appSettingsTable.$inferSelect;
