import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyBidsTable = pgTable("company_bids", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  buyerCompany: text("buyer_company").notNull(),
  contactPerson: text("contact_person"),
  mobile: text("mobile"),
  email: text("email"),
  bidAmount: numeric("bid_amount", { precision: 12, scale: 2 }).notNull(),
  location: text("location"),
  pickupTimeline: text("pickup_timeline"),
  paymentTerms: text("payment_terms"),
  remarks: text("remarks"),
  status: text("status").notNull().default("pending"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanyBidSchema = createInsertSchema(companyBidsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompanyBid = z.infer<typeof insertCompanyBidSchema>;
export type CompanyBid = typeof companyBidsTable.$inferSelect;
