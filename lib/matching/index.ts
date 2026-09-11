/**
 * The matching engine (brief section 8).
 *
 * A pure function: property and buyer data in, ranked results out, with no
 * database access anywhere inside. That is what makes it testable without a
 * database, and what lets the same engine drive the agent's fit strip and,
 * later, the buyer-facing match score — one scoring system, so the two sides
 * can never disagree about the same property.
 *
 * SCALE (section 8.5): matches are computed on page load, which the brief
 * confirms is fine to roughly 5,000 profiles. If that stops being true, this
 * is where a cache belongs — wrap `matchBuyersToProperty` keyed on the
 * property and the buyer set, and invalidate when either changes. Nothing
 * inside the engine needs to change for that.
 */

import {
  MATCH_EXCLUDED_LISTING_STATUSES,
  MATCH_EXCLUDED_STATUSES,
  MATCH_SUPPRESSING_FEEDBACK,
} from "../domain.ts";
import { CRITERIA } from "./criteria.ts";
import type {
  ExclusionReason,
  MatchBuyer,
  MatchContext,
  MatchFeedbackRecord,
  MatchProperty,
  MatchResult,
  MatchSearchProfile,
  Reason,
} from "./types.ts";

export * from "./types.ts";
export { POINTS } from "./criteria.ts";

/** A pre-approval is treated as lapsing after three months (see CLAUDE.md). */
export const PRE_APPROVAL_VALID_DAYS = 90;

const MS_PER_DAY = 86_400_000;

/**
 * Is this buyer's pre-approval still current?
 *
 * Agents rarely know the exact expiry, but they know when the buyer told them,
 * and pre-approvals here run about three months. An explicit expiry date wins
 * where one exists. With neither date recorded we treat it as current — we
 * have no evidence it lapsed, and guessing against the buyer would quietly
 * push them down the ranking.
 */
export function preApprovalIsCurrent(buyer: MatchBuyer, now: Date): boolean {
  if (buyer.finance !== "pre_approved") return false;

  if (buyer.preApprovalExpiresOn !== null) {
    return buyer.preApprovalExpiresOn.getTime() >= now.getTime();
  }

  if (buyer.preApprovalRecordedOn !== null) {
    const age =
      (now.getTime() - buyer.preApprovalRecordedOn.getTime()) / MS_PER_DAY;
    return age <= PRE_APPROVAL_VALID_DAYS;
  }

  return true;
}

/** Should the agent be prompted to re-confirm this pre-approval? */
export function preApprovalNeedsReconfirming(
  buyer: MatchBuyer,
  now: Date = new Date(),
): boolean {
  return buyer.finance === "pre_approved" && !preApprovalIsCurrent(buyer, now);
}

/**
 * Readiness for ranking (section 8.4). Lower is readier.
 *
 *   1. Cash, or pre-approved with a current pre-approval
 *   2. Buying now
 *   3. Within 3 months
 *   4. Everything else
 */
export function readinessRank(buyer: MatchBuyer, now: Date): 1 | 2 | 3 | 4 {
  if (buyer.finance === "cash" || preApprovalIsCurrent(buyer, now)) return 1;
  if (buyer.timeframe === "now") return 2;
  if (buyer.timeframe === "within_3_months") return 3;
  return 4;
}

/* -------------------------------------------------------------------------
 * Hard excludes (section 8.1)
 * ---------------------------------------------------------------------- */

/**
 * Returns why this buyer/profile can never be shown for this property, or
 * `null` if they're eligible.
 */
export function exclusionFor(
  property: MatchProperty,
  buyer: MatchBuyer,
  profile: MatchSearchProfile,
  feedback: MatchFeedbackRecord[],
): ExclusionReason | null {
  if (MATCH_EXCLUDED_STATUSES.includes(buyer.status)) return "buyer_closed";
  if (buyer.archivedAt !== null) return "buyer_archived";
  if (!profile.active) return "profile_inactive";

  if (MATCH_EXCLUDED_LISTING_STATUSES.includes(property.listingStatus)) {
    return "property_unavailable";
  }

  if (
    profile.propertyTypes.length > 0 &&
    !profile.propertyTypes.includes(property.propertyType)
  ) {
    return "property_type";
  }

  if (profile.dealBreakers.some((slug) => property.features.includes(slug))) {
    return "deal_breaker";
  }

  if (
    profile.suburbs.length > 0 &&
    !profile.suburbs.includes(property.suburb) &&
    !profile.alsoConsiderSuburbs.includes(property.suburb)
  ) {
    return "suburb";
  }

  // Over budget: the stretch is the ceiling where one exists, otherwise the max.
  if (property.priceGuideMin !== null) {
    const ceiling = profile.stretchMax ?? profile.priceMax;
    if (ceiling !== null && property.priceGuideMin > ceiling) {
      return "over_budget";
    }
  }

  // Two or more bedrooms short.
  if (
    profile.bedsMin !== null &&
    property.beds !== null &&
    property.beds <= profile.bedsMin - 2
  ) {
    return "too_few_bedrooms";
  }

  const suppressed = feedback.some(
    (f) =>
      f.buyerId === buyer.id &&
      f.propertyId === property.id &&
      MATCH_SUPPRESSING_FEEDBACK.includes(f.state),
  );
  if (suppressed) return "dismissed";

  return null;
}

/* -------------------------------------------------------------------------
 * Scoring one buyer/profile pair
 * ---------------------------------------------------------------------- */

/**
 * Score a single profile against a property. Returns `null` if the pairing is
 * hard-excluded.
 */
export function evaluateProfile(
  property: MatchProperty,
  buyer: MatchBuyer,
  profile: MatchSearchProfile,
  feedback: MatchFeedbackRecord[] = [],
  context: MatchContext = {},
): MatchResult | null {
  if (exclusionFor(property, buyer, profile, feedback) !== null) return null;

  const now = context.now ?? new Date();
  const reasons: Reason[] = [];
  let earned = 0;
  let possible = 0;

  for (const score of CRITERIA) {
    const result = score(profile, property);
    // null means the buyer never set this criterion: neither earned nor
    // possible, and it isn't shown as a reason at all.
    if (result === null) continue;

    reasons.push(result.reason);
    earned += result.earned;
    possible += result.possible;
  }

  // Every criterion the property couldn't answer leaves `possible` at zero,
  // so a property with no data at all scores 0 rather than dividing by zero.
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    buyerId: buyer.id,
    buyerName: `${buyer.firstName} ${buyer.lastName}`,
    propertyId: property.id,
    profileId: profile.id,
    profileName: profile.name,
    score,
    // Strict: a partial is not a fit. The fit strip shows the partials in
    // amber right beside this number, so the nuance isn't lost.
    metCount: reasons.filter((r) => r.result === "met").length,
    setCount: reasons.length,
    reasons,
    readiness: readinessRank(buyer, now),
  };
}

/**
 * The best result across all of a buyer's profiles.
 *
 * A buyer with several active profiles appears once, on whichever scores
 * highest (section 8.4).
 */
export function evaluateBuyer(
  property: MatchProperty,
  buyer: MatchBuyer,
  feedback: MatchFeedbackRecord[] = [],
  context: MatchContext = {},
): MatchResult | null {
  let best: MatchResult | null = null;

  for (const profile of buyer.profiles) {
    const result = evaluateProfile(property, buyer, profile, feedback, context);
    if (result !== null && (best === null || result.score > best.score)) {
      best = result;
    }
  }

  return best;
}

/* -------------------------------------------------------------------------
 * Ranking (section 8.4)
 * ---------------------------------------------------------------------- */

function compareResults(
  a: MatchResult,
  b: MatchResult,
  lastContacted: Map<string, Date | null>,
): number {
  // Fit score, highest first.
  if (a.score !== b.score) return b.score - a.score;

  // Then readiness, readiest first.
  if (a.readiness !== b.readiness) return a.readiness - b.readiness;

  // Then most recently contacted. Never-contacted buyers go last.
  const aTime = lastContacted.get(a.buyerId)?.getTime() ?? -Infinity;
  const bTime = lastContacted.get(b.buyerId)?.getTime() ?? -Infinity;
  if (aTime !== bTime) return bTime - aTime;

  // Stable, predictable finish so the order never jitters between loads.
  return a.buyerName.localeCompare(b.buyerName, "en-AU");
}

/**
 * Rank every buyer against one property. This is the property page
 * (section 9): ranked matched buyers, each with their reasons.
 */
export function matchBuyersToProperty(
  property: MatchProperty,
  buyers: MatchBuyer[],
  feedback: MatchFeedbackRecord[] = [],
  context: MatchContext = {},
): MatchResult[] {
  const results: MatchResult[] = [];
  const lastContacted = new Map<string, Date | null>();

  for (const buyer of buyers) {
    const result = evaluateBuyer(property, buyer, feedback, context);
    if (result !== null) {
      results.push(result);
      lastContacted.set(buyer.id, buyer.lastContactedAt);
    }
  }

  return results.sort((a, b) => compareResults(a, b, lastContacted));
}

/**
 * The same engine the other way round: which properties suit one buyer.
 * This is the right column of the buyer page (section 9).
 *
 * Ranked by fit alone — readiness is a property of the buyer, so it can't
 * separate one property from another.
 */
export function matchPropertiesToBuyer(
  buyer: MatchBuyer,
  properties: MatchProperty[],
  feedback: MatchFeedbackRecord[] = [],
  context: MatchContext = {},
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const property of properties) {
    const result = evaluateBuyer(property, buyer, feedback, context);
    if (result !== null) results.push(result);
  }

  return results.sort((a, b) => b.score - a.score || a.propertyId.localeCompare(b.propertyId));
}

/** "Fits 5 of 7" — the line that sits beside the fit strip (section 8.3). */
export function fitSummary(result: MatchResult): string {
  return `Fits ${result.metCount} of ${result.setCount}`;
}
