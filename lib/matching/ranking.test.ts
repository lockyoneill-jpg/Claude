/**
 * Ranking, readiness and multi-profile buyers — brief section 8.4,
 * plus the three-month pre-approval rule that supersedes the brief.
 */

import { describe, expect, it } from "vitest";

import {
  evaluateBuyer,
  matchBuyersToProperty,
  matchPropertiesToBuyer,
  preApprovalIsCurrent,
  preApprovalNeedsReconfirming,
  readinessRank,
} from "./index.ts";
import { aBuyer, aProfile, aProperty, daysAfter, daysBefore, NOW } from "./fixtures.ts";

const ctx = { now: NOW };

describe("pre-approval currency", () => {
  it("is current when recorded inside three months", () => {
    const buyer = aBuyer({ finance: "pre_approved", preApprovalRecordedOn: daysBefore(30) });
    expect(preApprovalIsCurrent(buyer, NOW)).toBe(true);
    expect(preApprovalNeedsReconfirming(buyer, NOW)).toBe(false);
  });

  it("lapses after three months and needs re-confirming", () => {
    const buyer = aBuyer({ finance: "pre_approved", preApprovalRecordedOn: daysBefore(100) });
    expect(preApprovalIsCurrent(buyer, NOW)).toBe(false);
    expect(preApprovalNeedsReconfirming(buyer, NOW)).toBe(true);
  });

  it("is still current on the ninetieth day", () => {
    const buyer = aBuyer({ finance: "pre_approved", preApprovalRecordedOn: daysBefore(90) });
    expect(preApprovalIsCurrent(buyer, NOW)).toBe(true);
  });

  it("prefers an explicit expiry date where the agent knows one", () => {
    const stillValid = aBuyer({
      finance: "pre_approved",
      preApprovalRecordedOn: daysBefore(200),
      preApprovalExpiresOn: daysAfter(10),
    });
    expect(preApprovalIsCurrent(stillValid, NOW)).toBe(true);

    const expired = aBuyer({
      finance: "pre_approved",
      preApprovalRecordedOn: daysBefore(5),
      preApprovalExpiresOn: daysBefore(1),
    });
    expect(preApprovalIsCurrent(expired, NOW)).toBe(false);
  });

  it("treats a pre-approval with no dates as current", () => {
    // No evidence it lapsed. Guessing against the buyer would quietly push
    // them down the ranking for no reason.
    const buyer = aBuyer({ finance: "pre_approved" });
    expect(preApprovalIsCurrent(buyer, NOW)).toBe(true);
  });

  it("is false for anyone who isn't pre-approved", () => {
    for (const finance of ["cash", "not_started", "unknown"] as const) {
      expect(preApprovalIsCurrent(aBuyer({ finance }), NOW)).toBe(false);
    }
  });
});

describe("readiness order", () => {
  it("puts cash buyers first", () => {
    expect(readinessRank(aBuyer({ finance: "cash", timeframe: "just_looking" }), NOW)).toBe(1);
  });

  it("puts a current pre-approval first", () => {
    const buyer = aBuyer({
      finance: "pre_approved",
      preApprovalRecordedOn: daysBefore(10),
      timeframe: "just_looking",
    });
    expect(readinessRank(buyer, NOW)).toBe(1);
  });

  it("drops a lapsed pre-approval out of the top tier", () => {
    const buyer = aBuyer({
      finance: "pre_approved",
      preApprovalRecordedOn: daysBefore(120),
      timeframe: "now",
    });
    expect(readinessRank(buyer, NOW)).toBe(2);
  });

  it("ranks buying now second", () => {
    expect(readinessRank(aBuyer({ finance: "not_started", timeframe: "now" }), NOW)).toBe(2);
  });

  it("ranks within three months third", () => {
    const buyer = aBuyer({ finance: "not_started", timeframe: "within_3_months" });
    expect(readinessRank(buyer, NOW)).toBe(3);
  });

  it.each(["within_6_months", "just_looking", "unknown"] as const)(
    "ranks %s last",
    (timeframe) => {
      expect(readinessRank(aBuyer({ finance: "unknown", timeframe }), NOW)).toBe(4);
    },
  );
});

describe("ranking buyers against a property", () => {
  it("sorts by fit score, highest first", () => {
    const strong = aBuyer({
      id: "strong",
      lastName: "Strong",
      profiles: [aProfile({ id: "p-strong" })],
    });
    // One bedroom short, so a lower score.
    const weaker = aBuyer({
      id: "weaker",
      lastName: "Weaker",
      profiles: [aProfile({ id: "p-weak", bedsMin: 5 })],
    });

    const ranked = matchBuyersToProperty(aProperty(), [weaker, strong], [], ctx);
    expect(ranked.map((r) => r.buyerId)).toEqual(["strong", "weaker"]);
  });

  it("breaks a score tie on readiness", () => {
    const ready = aBuyer({ id: "ready", finance: "cash", timeframe: "just_looking" });
    const notReady = aBuyer({ id: "not-ready", finance: "unknown", timeframe: "just_looking" });

    const ranked = matchBuyersToProperty(aProperty(), [notReady, ready], [], ctx);
    expect(ranked.map((r) => r.buyerId)).toEqual(["ready", "not-ready"]);
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it("breaks a score and readiness tie on most recently contacted", () => {
    const recent = aBuyer({ id: "recent", lastContactedAt: daysBefore(2) });
    const stale = aBuyer({ id: "stale", lastContactedAt: daysBefore(90) });

    const ranked = matchBuyersToProperty(aProperty(), [stale, recent], [], ctx);
    expect(ranked.map((r) => r.buyerId)).toEqual(["recent", "stale"]);
  });

  it("puts a never-contacted buyer behind a contacted one, all else equal", () => {
    const contacted = aBuyer({ id: "contacted", lastContactedAt: daysBefore(200) });
    const never = aBuyer({ id: "never", lastContactedAt: null });

    const ranked = matchBuyersToProperty(aProperty(), [never, contacted], [], ctx);
    expect(ranked.map((r) => r.buyerId)).toEqual(["contacted", "never"]);
  });

  it("leaves excluded buyers out entirely", () => {
    const eligible = aBuyer({ id: "eligible" });
    const purchased = aBuyer({ id: "purchased", status: "purchased" });

    const ranked = matchBuyersToProperty(aProperty(), [eligible, purchased], [], ctx);
    expect(ranked.map((r) => r.buyerId)).toEqual(["eligible"]);
  });

  it("returns an empty list rather than throwing when nobody matches", () => {
    expect(matchBuyersToProperty(aProperty({ listingStatus: "sold" }), [aBuyer()], [], ctx)).toEqual(
      [],
    );
  });
});

describe("buyers with several profiles", () => {
  it("appears once, on their best-scoring profile", () => {
    const buyer = aBuyer({
      profiles: [
        // An investment brief this house doesn't suit at all.
        aProfile({
          id: "investment",
          name: "Investment",
          suburbs: ["Highton"],
          propertyTypes: ["house"],
          priceMin: 400_000,
          priceMax: 1_000_000,
          bedsMin: 5,
          bathsMin: 3,
          carsMin: 3,
        }),
        // The family home brief, which it suits perfectly.
        aProfile({ id: "family", name: "Family home" }),
      ],
    });

    const ranked = matchBuyersToProperty(aProperty(), [buyer], [], ctx);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].profileId).toBe("family");
    expect(ranked[0].profileName).toBe("Family home");
    expect(ranked[0].score).toBe(100);
  });

  it("still matches on a second profile when the first is excluded", () => {
    const buyer = aBuyer({
      profiles: [
        aProfile({ id: "units-only", propertyTypes: ["unit"] }),
        aProfile({ id: "houses", propertyTypes: ["house"] }),
      ],
    });

    const result = evaluateBuyer(aProperty(), buyer, [], ctx);
    expect(result?.profileId).toBe("houses");
  });

  it("ignores inactive profiles", () => {
    const buyer = aBuyer({
      profiles: [aProfile({ id: "old", active: false }), aProfile({ id: "current" })],
    });
    expect(evaluateBuyer(aProperty(), buyer, [], ctx)?.profileId).toBe("current");
  });

  it("returns null when every profile is excluded", () => {
    const buyer = aBuyer({
      profiles: [aProfile({ propertyTypes: ["unit"] }), aProfile({ propertyTypes: ["land"] })],
    });
    expect(evaluateBuyer(aProperty(), buyer, [], ctx)).toBeNull();
  });
});

describe("the same engine in reverse, for the buyer page", () => {
  it("ranks properties for one buyer by fit", () => {
    const perfect = aProperty({ id: "perfect" });
    const oneShort = aProperty({ id: "one-short", beds: 3 });
    const sold = aProperty({ id: "sold", listingStatus: "sold" });

    const ranked = matchPropertiesToBuyer(aBuyer(), [oneShort, sold, perfect], [], ctx);
    expect(ranked.map((r) => r.propertyId)).toEqual(["perfect", "one-short"]);
  });

  it("respects dismissals in this direction too", () => {
    const feedback = [
      { buyerId: "buyer-1", propertyId: "property-1", state: "dismissed" as const },
    ];
    expect(matchPropertiesToBuyer(aBuyer(), [aProperty()], feedback, ctx)).toEqual([]);
  });
});
