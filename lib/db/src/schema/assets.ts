import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  category: text("category").notNull(), // CPU | Laptop | Desktop | Server | RAM | HDD | SSD | Networking | Battery | PCB | Printer | Monitor | Others
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  condition: text("condition"), // good | fair | poor | scrap
  estimatedWeight: numeric("estimated_weight"),
  estimatedValue: numeric("estimated_value"),
  status: text("status").notNull().default("pending"), // pending | inspected | collected
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
