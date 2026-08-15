import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buyersTable = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  gst: text("gst"),
  pan: text("pan"),
  state: text("state"),
  city: text("city"),
  address: text("address"),
  materialCategories: text("material_categories").array().notNull().default([]),
  maxBid: numeric("max_bid"),
  preferredMaterials: text("preferred_materials"),
  pickupStates: text("pickup_states").array().notNull().default([]),
  paymentTerms: text("payment_terms"),
  rating: numeric("rating").notNull().default("0"),
  status: text("status").notNull().default("active"), // active | inactive
  notes: text("notes"),
  totalBids: integer("total_bids").notNull().default(0),
  wonBids: integer("won_bids").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBuyerSchema = createInsertSchema(buyersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Buyer = typeof buyersTable.$inferSelect;
