/**
 * Per-criterion scoring and reasons (brief sections 8.2 and 8.3).
 *
 * Each function returns `null` when the buyer didn't set that criterion — an
 * unset criterion is neither earned nor possible, so someone who never
 * mentioned land size is never marked down for it. That is what makes the
 * score mean something rather than being an arbitrary percentage.
 *
 * When the buyer set a criterion but the PROPERTY has no data for it, the
 * result is `unknown`: shown to the agent, excluded from the score.
 */

import { featureLabel } from "../features.ts";
import { formatMoney } from "../format.ts";
import type {
  CriterionKey,
  MatchProperty,
  MatchSearchProfile,
  Reason,
  ReasonResult,
} from "./types.ts";

export type CriterionScore = {
  possible: number;
  earned: number;
  reason: Reason;
};

const LABELS: Record<CriterionKey, string> = {
  location: "Location",
  price: "Price",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  cars: "Car spaces",
  land: "Land size",
  must_haves: "Must-haves",
  nice_to_haves: "Nice-to-haves",
};

/** Points available per criterion, straight from the section 8.2 table. */
export const POINTS = {
  location: 25,
  price: 25,
  bedrooms: 15,
  bathrooms: 5,
  cars: 5,
  land: 5,
  must_haves: 15,
  nice_to_haves: 5,
} as const;

function make(
  criterion: CriterionKey,
  result: ReasonResult,
  detail: string,
  earned: number,
  possible: number,
): CriterionScore {
  return {
    possible,
    earned,
    reason: { criterion, label: LABELS[criterion], result, detail },
  };
}

/** An `unknown` result scores nothing and costs nothing. */
function unknown(criterion: CriterionKey, detail: string): CriterionScore {
  return make(criterion, "unknown", detail, 0, 0);
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

function listFeatures(slugs: string[]): string {
  return slugs.map(featureLabel).map((s) => s.toLowerCase()).join(", ");
}

/* -------------------------------------------------------------------------
 * Location — 25. In their suburbs 25, in also-consider 15.
 * ---------------------------------------------------------------------- */

export function scoreLocation(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  if (profile.suburbs.length === 0 && profile.alsoConsiderSuburbs.length === 0) {
    return null;
  }

  if (profile.suburbs.includes(property.suburb)) {
    return make(
      "location",
      "met",
      `In ${property.suburb}, one of their suburbs`,
      POINTS.location,
      POINTS.location,
    );
  }

  if (profile.alsoConsiderSuburbs.includes(property.suburb)) {
    return make(
      "location",
      "partial",
      `In ${property.suburb}, a suburb they'd also consider`,
      15,
      POINTS.location,
    );
  }

  // Only reachable when the buyer set also-consider suburbs but no primary
  // suburbs — otherwise the suburb exclusion has already removed them.
  return make(
    "location",
    "missed",
    `${property.suburb} isn't one of their suburbs`,
    0,
    POINTS.location,
  );
}

/* -------------------------------------------------------------------------
 * Price — 25. Guide inside their range 25, overlapping 20, stretch 10.
 * ---------------------------------------------------------------------- */

export function scorePrice(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  const { priceMin, priceMax, stretchMax } = profile;
  if (priceMin === null && priceMax === null && stretchMax === null) return null;

  const guideMin = property.priceGuideMin;
  if (guideMin === null) {
    return unknown("price", "No price guide on this property");
  }
  const guideMax = property.priceGuideMax ?? guideMin;

  const setsARange = priceMin !== null || priceMax !== null;
  const aboveFloor = priceMin === null || guideMin >= priceMin;
  const belowCeiling = priceMax === null || guideMax <= priceMax;

  if (setsARange && aboveFloor && belowCeiling) {
    return make(
      "price",
      "met",
      "Price guide sits inside their budget",
      POINTS.price,
      POINTS.price,
    );
  }

  const overlaps =
    (priceMin === null || guideMax >= priceMin) &&
    (priceMax === null || guideMin <= priceMax);

  if (setsARange && overlaps) {
    return make(
      "price",
      "partial",
      "Price guide overlaps the top of their budget",
      20,
      POINTS.price,
    );
  }

  if (stretchMax !== null && guideMin <= stretchMax && priceMax !== null) {
    const over = guideMin - priceMax;
    return make(
      "price",
      "partial",
      `${formatMoney(over)} over budget, within their stretch`,
      10,
      POINTS.price,
    );
  }

  // A buyer who set only a floor can sit above a cheap property. The upper
  // bound is handled by the over-budget exclusion before we ever get here.
  if (priceMin !== null && guideMax < priceMin) {
    return make(
      "price",
      "missed",
      `Under their price range of ${formatMoney(priceMin)} and up`,
      0,
      POINTS.price,
    );
  }

  return make("price", "missed", "Outside their budget", 0, POINTS.price);
}

/* -------------------------------------------------------------------------
 * Bedrooms — 15. Meets the minimum 15, one short 5.
 * ---------------------------------------------------------------------- */

export function scoreBedrooms(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  const min = profile.bedsMin;
  if (min === null) return null;

  if (property.beds === null) {
    return unknown("bedrooms", "No bedroom count on this property");
  }

  if (property.beds >= min) {
    return make(
      "bedrooms",
      "met",
      `${property.beds} ${plural(property.beds, "bedroom")}, they wanted ${min} or more`,
      POINTS.bedrooms,
      POINTS.bedrooms,
    );
  }

  if (property.beds === min - 1) {
    return make("bedrooms", "partial", "One bedroom short", 5, POINTS.bedrooms);
  }

  // Two or more short is a hard exclude, so this is unreachable in practice.
  return make(
    "bedrooms",
    "missed",
    `${property.beds} ${plural(property.beds, "bedroom")}, they wanted ${min}`,
    0,
    POINTS.bedrooms,
  );
}

/* -------------------------------------------------------------------------
 * Bathrooms and car spaces — 5 each, no partial credit.
 * ---------------------------------------------------------------------- */

function scoreMinimum(
  criterion: "bathrooms" | "cars",
  min: number | null,
  actual: number | null,
  noun: string,
  nounPlural: string,
): CriterionScore | null {
  if (min === null) return null;

  if (actual === null) {
    return unknown(criterion, `No ${noun} count on this property`);
  }

  const points = POINTS[criterion];

  if (actual >= min) {
    return make(
      criterion,
      "met",
      `${actual} ${plural(actual, noun, nounPlural)}, they wanted ${min} or more`,
      points,
      points,
    );
  }

  return make(
    criterion,
    "missed",
    `Only ${actual} ${plural(actual, noun, nounPlural)}, they wanted ${min}`,
    0,
    points,
  );
}

export function scoreBathrooms(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  return scoreMinimum(
    "bathrooms",
    profile.bathsMin,
    property.baths,
    "bathroom",
    "bathrooms",
  );
}

export function scoreCars(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  return scoreMinimum(
    "cars",
    profile.carsMin,
    property.cars,
    "car space",
    "car spaces",
  );
}

/* -------------------------------------------------------------------------
 * Land size — 5. Within their range only.
 * ---------------------------------------------------------------------- */

export function scoreLand(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  const { landMinSqm: min, landMaxSqm: max } = profile;
  if (min === null && max === null) return null;

  const land = property.landSqm;
  if (land === null) {
    return unknown("land", "No land size on this property");
  }

  const size = `${land.toLocaleString("en-AU")} sqm`;

  if ((min === null || land >= min) && (max === null || land <= max)) {
    return make("land", "met", `${size}, within their range`, POINTS.land, POINTS.land);
  }

  if (min !== null && land < min) {
    return make(
      "land",
      "missed",
      `${size}, they wanted at least ${min.toLocaleString("en-AU")} sqm`,
      0,
      POINTS.land,
    );
  }

  return make(
    "land",
    "missed",
    `${size}, they wanted no more than ${max?.toLocaleString("en-AU")} sqm`,
    0,
    POINTS.land,
  );
}

/* -------------------------------------------------------------------------
 * Must-haves (15) and nice-to-haves (5), split evenly across the list.
 *
 * A property with no features recorded scores these as missed rather than
 * unknown. An empty feature list is a real answer — we can't claim a property
 * has a pool just because nobody typed one in.
 * ---------------------------------------------------------------------- */

function scoreFeatures(
  criterion: "must_haves" | "nice_to_haves",
  wanted: string[],
  property: MatchProperty,
  noun: string,
): CriterionScore | null {
  if (wanted.length === 0) return null;

  const points = POINTS[criterion];
  const has = wanted.filter((slug) => property.features.includes(slug));
  const missing = wanted.filter((slug) => !property.features.includes(slug));
  const earned = (points * has.length) / wanted.length;

  if (missing.length === 0) {
    const detail =
      wanted.length === 1
        ? `Has their ${noun}: ${listFeatures(wanted)}`
        : `Has all ${wanted.length} ${noun}s: ${listFeatures(wanted)}`;
    return make(criterion, "met", detail, earned, points);
  }

  if (has.length === 0) {
    const detail =
      wanted.length === 1
        ? `No ${listFeatures(wanted)}`
        : `None of their ${wanted.length} ${noun}s: ${listFeatures(wanted)}`;
    return make(criterion, "missed", detail, earned, points);
  }

  return make(
    criterion,
    "partial",
    `Has ${has.length} of ${wanted.length} ${noun}s, missing ${listFeatures(missing)}`,
    earned,
    points,
  );
}

export function scoreMustHaves(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  return scoreFeatures("must_haves", profile.mustHaves, property, "must-have");
}

export function scoreNiceToHaves(
  profile: MatchSearchProfile,
  property: MatchProperty,
): CriterionScore | null {
  return scoreFeatures(
    "nice_to_haves",
    profile.niceToHaves,
    property,
    "nice-to-have",
  );
}

/** Every criterion, in the order they should be shown. */
export const CRITERIA = [
  scoreLocation,
  scorePrice,
  scoreBedrooms,
  scoreBathrooms,
  scoreCars,
  scoreLand,
  scoreMustHaves,
  scoreNiceToHaves,
] as const;
