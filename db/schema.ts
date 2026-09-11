/**
 * Database schema (brief section 5).
 *
 * Rules that apply to every table here:
 *  - UUID primary keys
 *  - `created_at` and `updated_at` on every table
 *  - every table except `agencies` carries `agency_id`, and every query
 *    filters by it — even though Phase 1 only ever has one agency. Doing this
 *    now is what makes Phase 5 (multiple agencies) a change of scope rather
 *    than a rebuild.
 *
 * Fields marked "Phase N" exist so later phases slot in without a migration
 * of existing data. They are unused in Phase 1.
 */

import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ACTIVITY_TYPES,
  BUYER_SOURCES,
  BUYER_STATUSES,
  FINANCE_STATUSES,
  LISTING_STATUSES,
  MATCH_FEEDBACK_STATES,
  PROPERTY_SOURCES,
  PROPERTY_TYPES,
  TIMEFRAMES,
} from "@/lib/domain";

/* -------------------------------------------------------------------------
 * Enums — built from the domain vocabulary so they can never drift
 * ---------------------------------------------------------------------- */

export const buyerStatusEnum = pgEnum("buyer_status", BUYER_STATUSES);
export const buyerSourceEnum = pgEnum("buyer_source", BUYER_SOURCES);
export const financeStatusEnum = pgEnum("finance_status", FINANCE_STATUSES);
export const timeframeEnum = pgEnum("timeframe", TIMEFRAMES);
export const propertyTypeEnum = pgEnum("property_type", PROPERTY_TYPES);
export const listingStatusEnum = pgEnum("listing_status", LISTING_STATUSES);
export const propertySourceEnum = pgEnum("property_source", PROPERTY_SOURCES);
export const matchFeedbackStateEnum = pgEnum(
  "match_feedback_state",
  MATCH_FEEDBACK_STATES,
);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);

/** Shared timestamp columns, so no table forgets them. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* -------------------------------------------------------------------------
 * agencies
 * ---------------------------------------------------------------------- */

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Default state for new listings, e.g. "VIC". */
  defaultState: text("default_state").notNull(),
  ...timestamps,
});

/* -------------------------------------------------------------------------
 * agents
 * ---------------------------------------------------------------------- */

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    // No login in Phase 1. Auth arrives in Phase 5.
    ...timestamps,
  },
  (table) => [index("agents_agency_idx").on(table.agencyId)],
);

/* -------------------------------------------------------------------------
 * buyers
 * ---------------------------------------------------------------------- */

export const buyers = pgTable(
  "buyers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    assignedAgentId: uuid("assigned_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    partnerName: text("partner_name"),

    source: buyerSourceEnum("source").notNull().default("other"),
    status: buyerStatusEnum("status").notNull().default("new_enquiry"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /* Readiness — kept separate from status on purpose (section 6). */
    finance: financeStatusEnum("finance").notNull().default("unknown"),
    preApprovalExpiresOn: date("pre_approval_expires_on"),
    /** Null means we haven't asked yet, which is different from "no". */
    needsToSell: boolean("needs_to_sell"),
    timeframe: timeframeEnum("timeframe").notNull().default("unknown"),

    /** The brief in the buyer's own words, as the agent wrote it down. */
    briefText: text("brief_text"),

    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    /* Consent — Phase 4 (email and SMS sending under the Spam Act). */
    emailConsent: boolean("email_consent").notNull().default(false),
    smsConsent: boolean("sms_consent").notNull().default(false),
    consentSource: text("consent_source"),
    consentAt: timestamp("consent_at", { withTimezone: true }),

    /* Portal link — Phase 6. Unused for now. */
    buyerAccountId: uuid("buyer_account_id"),

    ...timestamps,
  },
  (table) => [
    index("buyers_agency_idx").on(table.agencyId),
    index("buyers_agency_status_idx").on(table.agencyId, table.status),
    index("buyers_assigned_agent_idx").on(table.assignedAgentId),
    // Supports the "buyers to check in" list on Today.
    index("buyers_last_contacted_idx").on(table.lastContactedAt),
  ],
);

/* -------------------------------------------------------------------------
 * search_profiles
 *
 * A buyer can have more than one profile, e.g. "Family home" and "Investment".
 * Phase 1's UI defaults to one, but nothing here blocks adding more.
 * ---------------------------------------------------------------------- */

export const searchProfiles = pgTable(
  "search_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),

    name: text("name").notNull().default("Search profile"),
    active: boolean("active").notNull().default(true),

    suburbs: text("suburbs").array().notNull().default([]),
    alsoConsiderSuburbs: text("also_consider_suburbs")
      .array()
      .notNull()
      .default([]),
    /** Values from PROPERTY_TYPES. Empty means "no preference". */
    propertyTypes: text("property_types").array().notNull().default([]),

    /* Whole dollars. Null means the buyer didn't set this criterion, which
       matters: unset criteria are excluded from scoring (section 8.2). */
    priceMin: integer("price_min"),
    priceMax: integer("price_max"),
    /** What they'd stretch to for the right place. */
    stretchMax: integer("stretch_max"),

    bedsMin: integer("beds_min"),
    bathsMin: integer("baths_min"),
    carsMin: integer("cars_min"),

    landMinSqm: integer("land_min_sqm"),
    landMaxSqm: integer("land_max_sqm"),

    /* Feature slugs only — see lib/features.ts. */
    mustHaves: text("must_haves").array().notNull().default([]),
    niceToHaves: text("nice_to_haves").array().notNull().default([]),
    dealBreakers: text("deal_breakers").array().notNull().default([]),

    ...timestamps,
  },
  (table) => [
    index("search_profiles_buyer_idx").on(table.buyerId),
    index("search_profiles_agency_idx").on(table.agencyId),
  ],
);

/* -------------------------------------------------------------------------
 * properties
 * ---------------------------------------------------------------------- */

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    listingAgentId: uuid("listing_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),

    addressLine: text("address_line").notNull(),
    suburb: text("suburb").notNull(),
    state: text("state").notNull(),
    postcode: text("postcode"),

    propertyType: propertyTypeEnum("property_type").notNull().default("house"),
    listingStatus: listingStatusEnum("listing_status")
      .notNull()
      .default("off_market"),

    /** The advertised price text, e.g. "Offers over $850,000". */
    priceDisplay: text("price_display"),
    /* Internal only — used for matching, never shown to buyers.
       Null is meaningful: it makes the price criterion "unknown". */
    priceGuideMin: integer("price_guide_min"),
    priceGuideMax: integer("price_guide_max"),

    beds: integer("beds"),
    baths: integer("baths"),
    cars: integer("cars"),
    landSqm: integer("land_sqm"),
    buildingSqm: integer("building_sqm"),

    /** Feature slugs — see lib/features.ts. */
    features: text("features").array().notNull().default([]),
    description: text("description"),
    imageUrls: text("image_urls").array().notNull().default([]),

    /* Phase 2 — REAXML import. */
    source: propertySourceEnum("source").notNull().default("manual"),
    /** The listing's ID in the REAXML feed. Unique per agency. */
    externalId: text("external_id"),

    ...timestamps,
  },
  (table) => [
    index("properties_agency_idx").on(table.agencyId),
    index("properties_agency_status_idx").on(table.agencyId, table.listingStatus),
    index("properties_suburb_idx").on(table.suburb),
    unique("properties_agency_external_id_key").on(
      table.agencyId,
      table.externalId,
    ),
  ],
);

/* -------------------------------------------------------------------------
 * match_feedback
 *
 * One row per buyer/property pair. Dismissed and not-interested rows hide
 * the buyer from that property's matches (section 8.1).
 * ---------------------------------------------------------------------- */

export const matchFeedback = pgTable(
  "match_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),

    state: matchFeedbackStateEnum("state").notNull(),
    reason: text("reason"),

    ...timestamps,
  },
  (table) => [
    unique("match_feedback_buyer_property_key").on(
      table.buyerId,
      table.propertyId,
    ),
    index("match_feedback_property_idx").on(table.propertyId),
    index("match_feedback_agency_idx").on(table.agencyId),
  ],
);

/* -------------------------------------------------------------------------
 * activities
 *
 * The buyer's timeline. Status changes and match feedback write here
 * automatically, so the history is complete without the agent doing anything.
 * ---------------------------------------------------------------------- */

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),

    type: activityTypeEnum("type").notNull().default("note"),
    body: text("body").notNull(),

    ...timestamps,
  },
  (table) => [
    index("activities_buyer_idx").on(table.buyerId, table.createdAt),
    index("activities_agency_idx").on(table.agencyId),
  ],
);

/* -------------------------------------------------------------------------
 * Inferred types — use these instead of redeclaring shapes by hand
 * ---------------------------------------------------------------------- */

export type Agency = typeof agencies.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Buyer = typeof buyers.$inferSelect;
export type SearchProfile = typeof searchProfiles.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type MatchFeedback = typeof matchFeedback.$inferSelect;
export type Activity = typeof activities.$inferSelect;

export type NewAgency = typeof agencies.$inferInsert;
export type NewAgent = typeof agents.$inferInsert;
export type NewBuyer = typeof buyers.$inferInsert;
export type NewSearchProfile = typeof searchProfiles.$inferInsert;
export type NewProperty = typeof properties.$inferInsert;
export type NewMatchFeedback = typeof matchFeedback.$inferInsert;
export type NewActivity = typeof activities.$inferInsert;
