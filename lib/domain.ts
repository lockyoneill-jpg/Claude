/**
 * Domain vocabulary (brief sections 5 and 6).
 *
 * Single source of truth: the database schema builds its enums from these
 * arrays, so the database and the UI can never drift apart.
 */

/* -------------------------------------------------------------------------
 * Buyer status pipeline (section 6)
 * ---------------------------------------------------------------------- */

/** Pipeline columns, in order. These are the "active" statuses. */
export const PIPELINE_STATUSES = [
  "new_enquiry",
  "looking",
  "inspecting",
  "offer_made",
  "under_contract",
  "purchased",
] as const;

/** Off-pipeline statuses. These sit in a collapsible tray on the board. */
export const OFF_PIPELINE_STATUSES = [
  "paused",
  "bought_elsewhere",
  "not_proceeding",
] as const;

export const BUYER_STATUSES = [
  ...PIPELINE_STATUSES,
  ...OFF_PIPELINE_STATUSES,
] as const;

export type BuyerStatus = (typeof BUYER_STATUSES)[number];

export const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  new_enquiry: "New enquiry",
  looking: "Looking",
  inspecting: "Inspecting",
  offer_made: "Offer made",
  under_contract: "Under contract",
  purchased: "Purchased",
  paused: "Paused",
  bought_elsewhere: "Bought elsewhere",
  not_proceeding: "Not proceeding",
};

/**
 * Statuses that take a buyer out of matching entirely (section 8.1).
 * A buyer who has bought, or walked away, should never appear in matches.
 */
export const MATCH_EXCLUDED_STATUSES: readonly BuyerStatus[] = [
  "purchased",
  "bought_elsewhere",
  "not_proceeding",
];

/**
 * Only buyers still actively in the pipeline can be flagged stale.
 * Someone who is paused or has bought elsewhere doesn't need chasing.
 */
export const STALE_ELIGIBLE_STATUSES: readonly BuyerStatus[] = [
  "new_enquiry",
  "looking",
  "inspecting",
  "offer_made",
  "under_contract",
];

/* -------------------------------------------------------------------------
 * Stale buyer rules (section 6)
 * ---------------------------------------------------------------------- */

/** Contacted longer ago than this many days = needs a check in. */
export const STALE_AFTER_DAYS = 60;

/** Never contacted, and created longer ago than this = needs a check in. */
export const NEVER_CONTACTED_GRACE_DAYS = 14;

/* -------------------------------------------------------------------------
 * Buyer attributes (section 5)
 * ---------------------------------------------------------------------- */

export const BUYER_SOURCES = [
  "portal_enquiry",
  "open_home",
  "referral",
  "walk_in",
  "database_import",
  "other",
] as const;
export type BuyerSource = (typeof BUYER_SOURCES)[number];

export const BUYER_SOURCE_LABELS: Record<BuyerSource, string> = {
  portal_enquiry: "Portal enquiry",
  open_home: "Open home",
  referral: "Referral",
  walk_in: "Walk in",
  database_import: "Database import",
  other: "Other",
};

export const FINANCE_STATUSES = [
  "unknown",
  "not_started",
  "pre_approved",
  "cash",
] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];

export const FINANCE_LABELS: Record<FinanceStatus, string> = {
  unknown: "Finance unknown",
  not_started: "Finance not started",
  pre_approved: "Pre-approved",
  cash: "Cash buyer",
};

export const TIMEFRAMES = [
  "now",
  "within_3_months",
  "within_6_months",
  "just_looking",
  "unknown",
] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  now: "Buying now",
  within_3_months: "Within 3 months",
  within_6_months: "Within 6 months",
  just_looking: "Just looking",
  unknown: "Timeframe unknown",
};

/* -------------------------------------------------------------------------
 * Property attributes (section 5)
 * ---------------------------------------------------------------------- */

export const PROPERTY_TYPES = [
  "house",
  "unit",
  "townhouse",
  "land",
  "acreage",
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  unit: "Unit",
  townhouse: "Townhouse",
  land: "Land",
  acreage: "Acreage",
  other: "Other",
};

export const LISTING_STATUSES = [
  "off_market",
  "pre_market",
  "on_market",
  "under_offer",
  "sold",
  "withdrawn",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  off_market: "Off-market",
  pre_market: "Pre-market",
  on_market: "On-market",
  under_offer: "Under offer",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

/** A sold or withdrawn property is never matched against (section 8.1). */
export const MATCH_EXCLUDED_LISTING_STATUSES: readonly ListingStatus[] = [
  "sold",
  "withdrawn",
];

/** Where a listing came from. `reaxml` is unused until Phase 2. */
export const PROPERTY_SOURCES = ["manual", "reaxml"] as const;
export type PropertySource = (typeof PROPERTY_SOURCES)[number];

/* -------------------------------------------------------------------------
 * Match feedback and activities (section 5)
 * ---------------------------------------------------------------------- */

export const MATCH_FEEDBACK_STATES = [
  "shortlisted",
  "dismissed",
  "inspected",
  "not_interested",
] as const;
export type MatchFeedbackState = (typeof MATCH_FEEDBACK_STATES)[number];

export const MATCH_FEEDBACK_LABELS: Record<MatchFeedbackState, string> = {
  shortlisted: "Shortlisted",
  dismissed: "Dismissed",
  inspected: "Inspected",
  not_interested: "Not interested",
};

/** Feedback that hides a buyer from a property's matches (section 8.1). */
export const MATCH_SUPPRESSING_FEEDBACK: readonly MatchFeedbackState[] = [
  "dismissed",
  "not_interested",
];

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "status_change",
  "match_shortlisted",
  "match_dismissed",
  "inspection",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  call: "Call",
  status_change: "Status change",
  match_shortlisted: "Shortlisted",
  match_dismissed: "Dismissed",
  inspection: "Inspection",
};
