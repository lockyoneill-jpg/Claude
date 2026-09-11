/**
 * Matching engine types (brief section 8).
 *
 * These are deliberately plain shapes rather than the Drizzle row types. The
 * engine takes data in and gives results out, with no database access of its
 * own, so it can be tested without a database and reused anywhere — including
 * the buyer-facing match score later, without a second scoring system that
 * could drift out of step with this one.
 */

import type {
  BuyerStatus,
  FinanceStatus,
  ListingStatus,
  MatchFeedbackState,
  PropertyType,
  Timeframe,
} from "../domain.ts";

export type MatchProperty = {
  id: string;
  addressLine: string;
  suburb: string;
  propertyType: PropertyType;
  listingStatus: ListingStatus;
  /** Internal only. Null makes the price criterion unknown, not failed. */
  priceGuideMin: number | null;
  priceGuideMax: number | null;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  landSqm: number | null;
  /** Feature slugs. */
  features: string[];
};

export type MatchSearchProfile = {
  id: string;
  name: string;
  active: boolean;
  suburbs: string[];
  alsoConsiderSuburbs: string[];
  /** Empty means no preference. */
  propertyTypes: string[];
  /* Null on any of these means the buyer didn't set that criterion, which is
     scored differently from the property failing it. */
  priceMin: number | null;
  priceMax: number | null;
  stretchMax: number | null;
  bedsMin: number | null;
  bathsMin: number | null;
  carsMin: number | null;
  landMinSqm: number | null;
  landMaxSqm: number | null;
  mustHaves: string[];
  niceToHaves: string[];
  dealBreakers: string[];
};

export type MatchBuyer = {
  id: string;
  firstName: string;
  lastName: string;
  status: BuyerStatus;
  archivedAt: Date | null;
  finance: FinanceStatus;
  /** When the buyer first told us they were pre-approved. */
  preApprovalRecordedOn: Date | null;
  /** The actual expiry, where the agent knows it. */
  preApprovalExpiresOn: Date | null;
  timeframe: Timeframe;
  lastContactedAt: Date | null;
  profiles: MatchSearchProfile[];
};

export type MatchFeedbackRecord = {
  buyerId: string;
  propertyId: string;
  state: MatchFeedbackState;
};

export type CriterionKey =
  | "location"
  | "price"
  | "bedrooms"
  | "bathrooms"
  | "cars"
  | "land"
  | "must_haves"
  | "nice_to_haves";

/**
 * - `met`     — the property satisfies it
 * - `partial` — close: an also-consider suburb, a stretch price, one bed short
 * - `missed`  — the property doesn't satisfy it
 * - `unknown` — the property is missing the data this criterion needs, so it
 *               is excluded from the score rather than counted against anyone
 */
export type ReasonResult = "met" | "partial" | "missed" | "unknown";

export type Reason = {
  criterion: CriterionKey;
  /** Display label, e.g. "Bedrooms". */
  label: string;
  result: ReasonResult;
  /** Plain English, Australian spelling, whole dollars with commas. */
  detail: string;
};

export type MatchResult = {
  buyerId: string;
  buyerName: string;
  propertyId: string;
  /** Which of the buyer's profiles produced this — their best-scoring one. */
  profileId: string;
  profileName: string;
  /** 0–100. */
  score: number;
  /** Criteria fully met. Partials do NOT count — see metCount in README terms. */
  metCount: number;
  /** How many criteria the buyer set, including ones the property can't answer. */
  setCount: number;
  reasons: Reason[];
  /** 1 is most ready. Used for ranking, see section 8.4. */
  readiness: 1 | 2 | 3 | 4;
};

/** Why a buyer was excluded. Useful for tests and for explaining a zero-match. */
export type ExclusionReason =
  | "buyer_closed"
  | "buyer_archived"
  | "profile_inactive"
  | "property_unavailable"
  | "property_type"
  | "deal_breaker"
  | "suburb"
  | "over_budget"
  | "too_few_bedrooms"
  | "dismissed";

export type MatchContext = {
  /** Injected so tests are deterministic and don't depend on the clock. */
  now?: Date;
};
