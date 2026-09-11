/**
 * Seed script (brief section 12).
 *
 * Run with:  npm run db:seed
 *
 * Safe to run repeatedly — it clears the agency's data first, so you always
 * end up with exactly the demo set rather than duplicates piling up.
 */

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  activities,
  agencies,
  agents,
  buyers,
  matchFeedback,
  properties,
  searchProfiles,
  type NewActivity,
  type NewBuyer,
  type NewProperty,
  type NewSearchProfile,
} from "./schema.ts";
import {
  ACMA_MOBILES,
  AGENCY_NAME,
  AGENCY_STATE,
  AGENTS,
  BUYER_SPECS,
  PROPERTY_SPECS,
  STREETS,
  SUBURBS,
  type BuyerSpec,
  type ProfileSpec,
} from "./seed-data.ts";
import {
  STALE_AFTER_DAYS,
  NEVER_CONTACTED_GRACE_DAYS,
  STALE_ELIGIBLE_STATUSES,
  type BuyerStatus,
} from "../lib/domain.ts";

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

const NOW = new Date();

function daysAgo(days: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Sarah-Jane O'Halloran" -> "sarah-jane.ohalloran@example.com" */
function emailFor(first: string, last: string, taken: Set<string>): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/^dr\s+/, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z-]/g, "");

  const base = `${clean(first)}.${clean(last)}`;
  let email = `${base}@example.com`;
  let n = 2;
  while (taken.has(email)) {
    email = `${base}${n}@example.com`;
    n += 1;
  }
  taken.add(email);
  return email;
}

/**
 * Phone numbers.
 *
 * The ACMA reserves only ~30 specific mobile numbers for fictional use, so
 * those are handed out first and never invented beyond the published list.
 * Everyone else gets a Victorian landline from (03) 5550 xxxx and
 * (03) 7010 xxxx, which ARE reserved as complete ranges.
 */
function makePhoneAllocator() {
  let mobileIndex = 0;
  let landlineIndex = 0;

  return function nextPhone(): string {
    if (mobileIndex < ACMA_MOBILES.length) {
      const mobile = ACMA_MOBILES[mobileIndex];
      mobileIndex += 1;
      return mobile;
    }

    // 10,000 numbers per prefix, alternating between the two reserved ranges.
    const prefix = landlineIndex % 2 === 0 ? "5550" : "7010";
    const suffix = String(1000 + Math.floor(landlineIndex / 2)).padStart(4, "0");
    landlineIndex += 1;
    return `(03) ${prefix} ${suffix}`;
  };
}

function isStale(status: BuyerStatus, lastContactedAt: Date | null, createdAt: Date) {
  if (!STALE_ELIGIBLE_STATUSES.includes(status)) return false;

  const msPerDay = 86_400_000;
  if (lastContactedAt === null) {
    return (NOW.getTime() - createdAt.getTime()) / msPerDay > NEVER_CONTACTED_GRACE_DAYS;
  }
  return (NOW.getTime() - lastContactedAt.getTime()) / msPerDay > STALE_AFTER_DAYS;
}

function profileRow(
  spec: ProfileSpec,
  name: string,
  buyerId: string,
  agencyId: string,
): NewSearchProfile {
  return {
    buyerId,
    agencyId,
    name,
    active: true,
    suburbs: spec.suburbs,
    alsoConsiderSuburbs: spec.also ?? [],
    propertyTypes: spec.types ?? [],
    priceMin: spec.priceMin ?? null,
    priceMax: spec.priceMax ?? null,
    stretchMax: spec.stretch ?? null,
    bedsMin: spec.beds ?? null,
    bathsMin: spec.baths ?? null,
    carsMin: spec.cars ?? null,
    landMinSqm: spec.landMin ?? null,
    landMaxSqm: spec.landMax ?? null,
    mustHaves: spec.must ?? [],
    niceToHaves: spec.nice ?? [],
    dealBreakers: spec.breakers ?? [],
  };
}

/* -------------------------------------------------------------------------
 * Seed
 * ---------------------------------------------------------------------- */

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste your " +
        "Supabase connection string into it, then run npm run db:seed again.",
    );
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  // drizzle-kit push can fail and still exit 0, so don't assume the tables are
  // there just because `npm run setup` got this far.
  const [{ exists }] = await db.execute<{ exists: boolean }>(
    sql`select to_regclass('public.agencies') is not null as exists`,
  );

  if (!exists) {
    await client.end();
    throw new Error(
      "The database tables don't exist yet. Run `npm run db:push` first, " +
        "then run `npm run db:seed` again.",
    );
  }

  console.log("Clearing existing data...");
  // Order matters only without cascades; truncating together is simplest.
  await db.execute(
    sql`truncate table ${activities}, ${matchFeedback}, ${searchProfiles}, ${properties}, ${buyers}, ${agents}, ${agencies} restart identity cascade`,
  );

  /* ---- Agency ---------------------------------------------------------- */

  const [agency] = await db
    .insert(agencies)
    .values({ name: AGENCY_NAME, defaultState: AGENCY_STATE })
    .returning();
  const agencyId = agency.id;
  console.log(`Created agency: ${agency.name} (${agency.defaultState})`);

  /* ---- Agents ---------------------------------------------------------- */

  const nextPhone = makePhoneAllocator();
  const takenEmails = new Set<string>();

  const agentRows = await db
    .insert(agents)
    .values(
      AGENTS.map((a) => {
        takenEmails.add(a.email);
        return {
          agencyId,
          name: a.name,
          email: a.email,
          phone: nextPhone(),
        };
      }),
    )
    .returning();
  console.log(`Created ${agentRows.length} agents`);

  /* ---- Buyers and search profiles -------------------------------------- */

  const buyerRows: NewBuyer[] = BUYER_SPECS.map((spec: BuyerSpec, i) => {
    const createdAt = daysAgo(spec.createdDaysAgo ?? 30);
    const lastContactedAt = spec.neverContacted
      ? null
      : daysAgo(spec.contactedDaysAgo ?? 7);

    // Status changed at some point after the record was created.
    const statusChangedAt = lastContactedAt ?? createdAt;

    return {
      agencyId,
      // Round robin so every agent has a real workload.
      assignedAgentId: agentRows[i % agentRows.length].id,
      firstName: spec.first,
      lastName: spec.last,
      email: emailFor(spec.first, spec.last, takenEmails),
      phone: nextPhone(),
      partnerName: spec.partner ?? null,
      source: spec.source,
      status: spec.status,
      statusChangedAt,
      finance: spec.finance,
      preApprovalExpiresOn:
        spec.preApprovalInDays === undefined
          ? null
          : daysFromNow(spec.preApprovalInDays),
      needsToSell: spec.needsToSell ?? null,
      timeframe: spec.timeframe,
      briefText: spec.brief,
      lastContactedAt,
      archivedAt: null,
      // Consent is Phase 4. Seeded plausibly so the fields aren't empty,
      // but nothing in Phase 1 reads them.
      emailConsent: spec.source !== "database_import",
      smsConsent: spec.source === "open_home" || spec.source === "walk_in",
      consentSource: spec.source === "database_import" ? null : spec.source,
      consentAt: spec.source === "database_import" ? null : createdAt,
      buyerAccountId: null,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const insertedBuyers = await db.insert(buyers).values(buyerRows).returning();
  console.log(`Created ${insertedBuyers.length} buyers`);

  const profileRows: NewSearchProfile[] = [];
  BUYER_SPECS.forEach((spec, i) => {
    const buyerId = insertedBuyers[i].id;
    profileRows.push(
      profileRow(spec, spec.second ? "Family home" : "Search profile", buyerId, agencyId),
    );
    if (spec.second) {
      profileRows.push(
        profileRow(spec.second, spec.second.name ?? "Second profile", buyerId, agencyId),
      );
    }
  });

  await db.insert(searchProfiles).values(profileRows);
  console.log(`Created ${profileRows.length} search profiles`);

  /* ---- Properties ------------------------------------------------------ */

  const propertyRows: NewProperty[] = PROPERTY_SPECS.map((spec, i) => {
    const createdAt = daysAgo(spec.addedDaysAgo);
    return {
      agencyId,
      listingAgentId: agentRows[i % agentRows.length].id,
      addressLine: `${spec.streetNumber} ${spec.street}`,
      suburb: spec.suburb,
      state: AGENCY_STATE,
      postcode: SUBURBS[spec.suburb] ?? null,
      propertyType: spec.type,
      listingStatus: spec.status,
      priceDisplay: spec.priceDisplay ?? null,
      priceGuideMin: spec.guideMin ?? null,
      priceGuideMax: spec.guideMax ?? null,
      beds: spec.beds ?? null,
      baths: spec.baths ?? null,
      cars: spec.cars ?? null,
      landSqm: spec.landSqm ?? null,
      buildingSqm: spec.buildingSqm ?? null,
      features: spec.features,
      description: spec.description,
      imageUrls: [],
      source: "manual" as const,
      externalId: null,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const insertedProperties = await db
    .insert(properties)
    .values(propertyRows)
    .returning();
  console.log(`Created ${insertedProperties.length} properties`);

  /* ---- Activities ------------------------------------------------------ */

  const activityRows: NewActivity[] = [];

  BUYER_SPECS.forEach((spec, i) => {
    const buyer = insertedBuyers[i];
    const agentId = buyer.assignedAgentId;
    const createdAt = buyer.createdAt;

    const sourceOpening: Record<string, string> = {
      portal_enquiry: "Enquiry received from a portal listing.",
      open_home: "Met at an open home and took their details.",
      referral: "Referred to us by a past client.",
      walk_in: "Walked into the office.",
      database_import: "Imported from the old database.",
      other: "Added to the database.",
    };

    activityRows.push({
      agencyId,
      buyerId: buyer.id,
      agentId,
      propertyId: null,
      type: "note",
      body: sourceOpening[spec.source] ?? "Added to the database.",
      createdAt,
      updatedAt: createdAt,
    });

    if (buyer.lastContactedAt) {
      activityRows.push({
        agencyId,
        buyerId: buyer.id,
        agentId,
        propertyId: null,
        type: "call",
        body: "Called to talk through what they're after and where they're up to.",
        createdAt: buyer.lastContactedAt,
        updatedAt: buyer.lastContactedAt,
      });
    }

    // Anyone past the first column has moved at least once.
    if (spec.status !== "new_enquiry") {
      activityRows.push({
        agencyId,
        buyerId: buyer.id,
        agentId,
        propertyId: null,
        type: "status_change",
        body: `Status changed to ${spec.status.replace(/_/g, " ")}.`,
        createdAt: buyer.statusChangedAt,
        updatedAt: buyer.statusChangedAt,
      });
    }
  });

  await db.insert(activities).values(activityRows);
  console.log(`Created ${activityRows.length} activities`);

  /* ---- A little match feedback ------------------------------------------
   * Deliberately NOT on the hero listing at 18 Kerrisdale Court: dismissing a
   * buyer hides them from that property's matches, and the demo needs its
   * full spread of matches intact.
   */

  const hero = insertedProperties.find((p) =>
    p.addressLine.startsWith("18 Kerrisdale"),
  );
  const feedbackTargets = insertedProperties.filter(
    (p) => p.id !== hero?.id && p.listingStatus !== "sold",
  );

  if (feedbackTargets.length > 0) {
    const states = ["shortlisted", "dismissed", "inspected", "not_interested"] as const;
    const feedbackRows = insertedBuyers.slice(0, 12).map((buyer, i) => ({
      agencyId,
      buyerId: buyer.id,
      propertyId: feedbackTargets[i % feedbackTargets.length].id,
      agentId: buyer.assignedAgentId,
      state: states[i % states.length],
      reason:
        states[i % states.length] === "dismissed"
          ? "Wrong end of the suburb for them."
          : null,
    }));

    await db.insert(matchFeedback).values(feedbackRows);
    console.log(`Created ${feedbackRows.length} match feedback records`);
  }

  /* ---- Summary --------------------------------------------------------- */

  const staleCount = BUYER_SPECS.filter((spec, i) =>
    isStale(spec.status, insertedBuyers[i].lastContactedAt, insertedBuyers[i].createdAt),
  ).length;

  const expiringCount = BUYER_SPECS.filter(
    (s) => s.preApprovalInDays !== undefined && s.preApprovalInDays >= 0 && s.preApprovalInDays <= 30,
  ).length;

  console.log("");
  console.log("Seed complete.");
  console.log(`  Buyers                      ${insertedBuyers.length}`);
  console.log(`  Search profiles             ${profileRows.length}`);
  console.log(`  Properties                  ${insertedProperties.length}`);
  console.log(`  Flagged for a check in      ${staleCount}`);
  console.log(`  Pre-approvals expiring soon ${expiringCount}`);
  console.log(`  Streets available           ${STREETS.length}`);

  await client.end();
}

seed().catch((error: unknown) => {
  // Lead with something readable. The full object only helps if the message
  // isn't already self-explanatory.
  console.error("");
  console.error("Seed failed.");
  console.error(error instanceof Error ? error.message : String(error));

  const cause = error instanceof Error ? error.cause : undefined;
  if (cause) console.error(cause instanceof Error ? cause.message : String(cause));

  process.exit(1);
});
