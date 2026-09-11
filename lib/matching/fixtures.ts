/**
 * Test fixtures.
 *
 * Builders with sensible defaults, so each test states only the one thing it
 * is actually about. The defaults are a clean match: a Highton house that
 * satisfies every criterion the default buyer sets.
 */

import type {
  MatchBuyer,
  MatchProperty,
  MatchSearchProfile,
} from "./types.ts";

export function aProperty(overrides: Partial<MatchProperty> = {}): MatchProperty {
  return {
    id: "property-1",
    addressLine: "18 Kerrisdale Court",
    suburb: "Highton",
    propertyType: "house",
    listingStatus: "off_market",
    priceGuideMin: 880_000,
    priceGuideMax: 950_000,
    beds: 4,
    baths: 2,
    cars: 2,
    landSqm: 620,
    features: ["ensuite", "study", "garage", "walk_to_school", "quiet_street"],
    ...overrides,
  };
}

export function aProfile(
  overrides: Partial<MatchSearchProfile> = {},
): MatchSearchProfile {
  return {
    id: "profile-1",
    name: "Search profile",
    active: true,
    suburbs: ["Highton"],
    alsoConsiderSuburbs: [],
    propertyTypes: ["house"],
    priceMin: 850_000,
    priceMax: 980_000,
    stretchMax: null,
    bedsMin: 4,
    bathsMin: 2,
    carsMin: 2,
    landMinSqm: null,
    landMaxSqm: null,
    mustHaves: [],
    niceToHaves: [],
    dealBreakers: [],
    ...overrides,
  };
}

export function aBuyer(overrides: Partial<MatchBuyer> = {}): MatchBuyer {
  const { profiles, ...rest } = overrides;
  return {
    id: "buyer-1",
    firstName: "Nadia",
    lastName: "Fenwick",
    status: "looking",
    archivedAt: null,
    finance: "pre_approved",
    preApprovalRecordedOn: null,
    preApprovalExpiresOn: null,
    timeframe: "now",
    lastContactedAt: new Date("2026-09-01T00:00:00Z"),
    profiles: profiles ?? [aProfile()],
    ...rest,
  };
}

/** Fixed clock so nothing in these tests depends on the day they run. */
export const NOW = new Date("2026-09-11T00:00:00Z");

export function daysBefore(days: number, from: Date = NOW): Date {
  return new Date(from.getTime() - days * 86_400_000);
}

export function daysAfter(days: number, from: Date = NOW): Date {
  return new Date(from.getTime() + days * 86_400_000);
}
