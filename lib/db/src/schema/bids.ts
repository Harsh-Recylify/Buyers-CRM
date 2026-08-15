import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  companyId: integer("company_id").notNull(),
  status: text("status").notNull().default("open"), // open | negotiation | awarded | rejected | cancelled | completed
  description: text("description"),
  expiryDate: text("expiry_date"),
  winningBuyerId: integer("winning_buyer_id"),
  winningAmount: numeric("winning_amount"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bidQuotesTable = pgTable("bid_quotes", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  amount: numeric("amount").notNull(),
  counterOffer: numeric("counter_offer"),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected | counter_offered
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bidHistoryTable = pgTable("bid_history", {
  id: serial("id").primaryKey(),
  bidId: integer("bid_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBidQuoteSchema = createInsertSchema(bidQuotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBidHistorySchema = createInsertSchema(bidHistoryTable).omit({ id: true, createdAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
export type BidQuote = typeof bidQuotesTable.$inferSelect;
export type BidHistory = typeof bidHistoryTable.$inferSelect;
