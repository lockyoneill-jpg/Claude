/**
 * Database rows to matching engine inputs.
 *
 * The engine is pure and knows nothing about Drizzle (brief section 8), so the
 * translation lives here. Every import is type-only, which means Node erases
 * them entirely — that is what lets the seed and the `demo:matches` script use
 * these under plain `node` while the app uses them through Next.
 */

import type { Buyer, Property, SearchProfile } from "../../db/schema.ts";
import type {
  MatchBuyer,
  MatchProperty,
  MatchSearchProfile,
} from "./types.ts";

/** Postgres `date` columns come back as "YYYY-MM-DD" strings. */
export function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00Z`);
}

export function toMatchProperty(row: Property): MatchProperty {
  return {
    id: row.id,
    addressLine: row.addressLine,
    suburb: row.suburb,
    propertyType: row.propertyType,
    listingStatus: row.listingStatus,
    priceGuideMin: row.priceGuideMin,
    priceGuideMax: row.priceGuideMax,
    beds: row.beds,
    baths: row.baths,
    cars: row.cars,
    landSqm: row.landSqm,
    features: row.features,
  };
}

export function toMatchProfile(row: SearchProfile): MatchSearchProfile {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    suburbs: row.suburbs,
    alsoConsiderSuburbs: row.alsoConsiderSuburbs,
    propertyTypes: row.propertyTypes,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    stretchMax: row.stretchMax,
    bedsMin: row.bedsMin,
    bathsMin: row.bathsMin,
    carsMin: row.carsMin,
    landMinSqm: row.landMinSqm,
    landMaxSqm: row.landMaxSqm,
    mustHaves: row.mustHaves,
    niceToHaves: row.niceToHaves,
    dealBreakers: row.dealBreakers,
  };
}

export function toMatchBuyer(
  row: Buyer,
  profiles: SearchProfile[],
): MatchBuyer {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.status,
    archivedAt: row.archivedAt,
    finance: row.finance,
    preApprovalRecordedOn: toDate(row.preApprovalRecordedOn),
    preApprovalExpiresOn: toDate(row.preApprovalExpiresOn),
    timeframe: row.timeframe,
    lastContactedAt: row.lastContactedAt,
    profiles: profiles.map(toMatchProfile),
  };
}
