import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  website: text("website"),
  gst: text("gst"),
  pan: text("pan"),
  address: text("address"),
  state: text("state"),
  city: text("city"),
  pincode: text("pincode"),
  leadSource: text("lead_source"),
  ownerId: integer("owner_id"),
  assignedManagerId: integer("assigned_manager_id"),
  stage: text("stage").notNull().default("New Lead"),
  priority: text("priority").notNull().default("medium"), // high | medium | low
  status: text("status").notNull().default("active"), // active | archived | deleted
  expectedScrapWeight: numeric("expected_scrap_weight"),
  expectedRevenue: numeric("expected_revenue"),
  expectedPickupDate: text("expected_pickup_date"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
