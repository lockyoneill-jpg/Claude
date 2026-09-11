/**
 * Prints real matches from the seeded data, in plain English.
 *
 * Run with:  npm run demo:matches
 *
 * This is the Session 2 deliverable: proof the engine works against real data,
 * before any of it has a screen (the fit strip arrives in Session 4).
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  buyers as buyersTable,
  matchFeedback as feedbackTable,
  properties as propertiesTable,
  searchProfiles as profilesTable,
} from "../db/schema.ts";
import { fitSummary, matchBuyersToProperty } from "../lib/matching/index.ts";
import {
  toMatchBuyer,
  toMatchProperty,
} from "../lib/matching/from-db.ts";
import type { MatchResult } from "../lib/matching/types.ts";
import { formatMoney } from "../lib/format.ts";

const RESULT_MARK: Record<string, string> = {
  met: "[ok  ]",
  partial: "[part]",
  missed: "[miss]",
  unknown: "[ ?  ]",
};

function heading(text: string) {
  console.log("");
  console.log(text);
  console.log("-".repeat(text.length));
}

function describe(result: MatchResult, rank: number) {
  console.log("");
  console.log(`${rank}. ${result.buyerName} — ${result.score}/100, ${fitSummary(result)}`);
  if (result.profileName !== "Search profile") {
    console.log(`   Matched on their "${result.profileName}" profile`);
  }
  for (const reason of result.reasons) {
    console.log(`   ${RESULT_MARK[reason.result]} ${reason.label}: ${reason.detail}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste your " +
        "Supabase connection string into it, then run npm run demo:matches again.",
    );
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  // The hero off-market listing from the seed data.
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.addressLine, "18 Kerrisdale Court"))
    .limit(1);

  if (!property) {
    console.error("No seeded data found. Run `npm run db:seed` first.");
    await client.end();
    process.exit(1);
  }

  const matchProperty = toMatchProperty(property);

  const buyerRows = await db
    .select()
    .from(buyersTable)
    .where(eq(buyersTable.agencyId, property.agencyId));

  const profileRows = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.agencyId, property.agencyId));

  const feedbackRows = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.agencyId, property.agencyId));

  const profilesByBuyer = new Map<string, typeof profileRows>();
  for (const row of profileRows) {
    const list = profilesByBuyer.get(row.buyerId) ?? [];
    list.push(row);
    profilesByBuyer.set(row.buyerId, list);
  }

  const matchBuyers = buyerRows.map((row) =>
    toMatchBuyer(row, profilesByBuyer.get(row.id) ?? []),
  );

  const ranked = matchBuyersToProperty(matchProperty, matchBuyers, feedbackRows);

  /* ---- The property ---------------------------------------------------- */

  heading("The property");
  console.log(`${property.addressLine}, ${property.suburb} ${property.state}`);
  console.log(
    `${property.beds} bed, ${property.baths} bath, ${property.cars} car, ${property.landSqm} sqm`,
  );
  console.log(`Advertised as: ${property.priceDisplay}`);
  console.log(
    `Internal price guide: ${formatMoney(property.priceGuideMin)} to ${formatMoney(property.priceGuideMax)}`,
  );
  console.log(`Status: ${property.listingStatus.replace(/_/g, "-")}`);

  /* ---- Everyone who matched -------------------------------------------- */

  heading(`Matched buyers (${ranked.length} of ${matchBuyers.length} in the database)`);
  ranked.forEach((result, i) => {
    const rank = String(i + 1).padStart(2, " ");
    const score = String(result.score).padStart(3, " ");
    console.log(`${rank}. ${score}/100  ${fitSummary(result).padEnd(12)} ${result.buyerName}`);
  });

  /* ---- Three worked examples ------------------------------------------- */

  // Pick three that show the spread rather than the top three, which all look
  // alike: the best match, someone who only reaches it by stretching, and
  // someone a bedroom short.
  const best = ranked[0];
  const stretched = ranked.find((r) =>
    r.reasons.some((x) => x.criterion === "price" && x.detail.includes("stretch")),
  );
  const bedroomShort = ranked.find((r) =>
    r.reasons.some((x) => x.criterion === "bedrooms" && x.result === "partial"),
  );

  const chosen = [best, stretched, bedroomShort].filter(
    (r, i, all): r is MatchResult =>
      r !== undefined && all.findIndex((o) => o?.buyerId === r.buyerId) === i,
  );

  heading("Three of them in full");
  chosen.forEach((result) => describe(result, ranked.indexOf(result) + 1));

  console.log("");
  await client.end();
}

main().catch((error: unknown) => {
  console.error("");
  console.error("Could not show matches.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
