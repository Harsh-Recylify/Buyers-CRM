import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recyclersTable = pgTable("recyclers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  gst: text("gst"),
  cpcbAuth: text("cpcb_auth"),
  spcbAuth: text("spcb_auth"),
  certificates: text("certificates"),
  address: text("address"),
  materialCategories: text("material_categories").array().notNull().default([]),
  capacity: text("capacity"),
  pickupArea: text("pickup_area"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecyclerSchema = createInsertSchema(recyclersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecycler = z.infer<typeof insertRecyclerSchema>;
export type Recycler = typeof recyclersTable.$inferSelect;
