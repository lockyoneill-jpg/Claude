/**
 * The bridge between the database and the matching engine.
 *
 * The engine itself is pure and knows nothing about Drizzle (brief section 8),
 * so this is the only place that translates rows into its input shapes. It is
 * also where a cache would go if page-load matching ever stops being fast
 * enough (section 8.5) — the engine underneath would not change.
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  buyers as buyersTable,
  matchFeedback as feedbackTable,
  properties as propertiesTable,
  searchProfiles as profilesTable,
  type Buyer,
  type MatchFeedback,
  type Property,
  type SearchProfile,
} from "@/db/schema";

import {
  matchBuyersToProperty,
  matchPropertiesToBuyer,
  type MatchResult,
} from "@/lib/matching";
import { toMatchBuyer, toMatchProperty } from "@/lib/matching/from-db";

export type PropertyMatch = {
  property: Property;
  result: MatchResult;
  /** Existing agent feedback on this pairing, if any. */
  feedback: MatchFeedback | null;
};

/**
 * Properties that suit one buyer — the right column of the buyer page.
 *
 * Matching is computed on page load, which the brief confirms is fine for
 * Phase 1 (section 8.5).
 */
export async function matchesForBuyer(
  agencyId: string,
  buyerId: string,
  options: { profileId?: string } = {},
): Promise<PropertyMatch[]> {
  const [buyer] = await db
    .select()
    .from(buyersTable)
    .where(and(eq(buyersTable.id, buyerId), eq(buyersTable.agencyId, agencyId)))
    .limit(1);

  if (!buyer) return [];

  const allProfiles = await db
    .select()
    .from(profilesTable)
    .where(
      and(
        eq(profilesTable.buyerId, buyerId),
        eq(profilesTable.agencyId, agencyId),
      ),
    );

  // The buyer page shows one profile at a time, so narrow to the chosen one
  // before matching rather than silently returning their best.
  const profiles = options.profileId
    ? allProfiles.filter((p) => p.id === options.profileId)
    : allProfiles;

  const [propertyRows, feedbackRows] = await Promise.all([
    db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.agencyId, agencyId)),
    db
      .select()
      .from(feedbackTable)
      .where(
        and(
          eq(feedbackTable.agencyId, agencyId),
          eq(feedbackTable.buyerId, buyerId),
        ),
      ),
  ]);

  const matchBuyer = toMatchBuyer(buyer, profiles);
  const results = matchPropertiesToBuyer(
    matchBuyer,
    propertyRows.map(toMatchProperty),
    feedbackRows,
  );

  const propertyById = new Map(propertyRows.map((p) => [p.id, p]));
  const feedbackByProperty = new Map(feedbackRows.map((f) => [f.propertyId, f]));

  return results.flatMap((result) => {
    const property = propertyById.get(result.propertyId);
    if (!property) return [];
    return [
      {
        property,
        result,
        feedback: feedbackByProperty.get(result.propertyId) ?? null,
      },
    ];
  });
}

export type BuyerMatch = {
  buyer: Buyer;
  result: MatchResult;
  feedback: MatchFeedback | null;
};

/** Buyers who suit one property — the property page (built in Session 4). */
export async function matchesForProperty(
  agencyId: string,
  propertyId: string,
): Promise<BuyerMatch[]> {
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.id, propertyId),
        eq(propertiesTable.agencyId, agencyId),
      ),
    )
    .limit(1);

  if (!property) return [];

  const [buyerRows, profileRows, feedbackRows] = await Promise.all([
    db.select().from(buyersTable).where(eq(buyersTable.agencyId, agencyId)),
    db.select().from(profilesTable).where(eq(profilesTable.agencyId, agencyId)),
    db
      .select()
      .from(feedbackTable)
      .where(
        and(
          eq(feedbackTable.agencyId, agencyId),
          eq(feedbackTable.propertyId, propertyId),
        ),
      ),
  ]);

  const profilesByBuyer = new Map<string, SearchProfile[]>();
  for (const row of profileRows) {
    const list = profilesByBuyer.get(row.buyerId) ?? [];
    list.push(row);
    profilesByBuyer.set(row.buyerId, list);
  }

  const results = matchBuyersToProperty(
    toMatchProperty(property),
    buyerRows.map((b) => toMatchBuyer(b, profilesByBuyer.get(b.id) ?? [])),
    feedbackRows,
  );

  const buyerById = new Map(buyerRows.map((b) => [b.id, b]));
  const feedbackByBuyer = new Map(feedbackRows.map((f) => [f.buyerId, f]));

  return results.flatMap((result) => {
    const buyer = buyerById.get(result.buyerId);
    if (!buyer) return [];
    return [
      { buyer, result, feedback: feedbackByBuyer.get(result.buyerId) ?? null },
    ];
  });
}
