/**
 * Scoring and reasons — brief sections 8.2 and 8.3.
 */

import { describe, expect, it } from "vitest";

import {
  scoreBathrooms,
  scoreBedrooms,
  scoreCars,
  scoreLand,
  scoreLocation,
  scoreMustHaves,
  scoreNiceToHaves,
  scorePrice,
} from "./criteria.ts";
import { evaluateProfile, fitSummary } from "./index.ts";
import { aBuyer, aProfile, aProperty, NOW } from "./fixtures.ts";

const ctx = { now: NOW };

/** Score one profile against one property and index the reasons by criterion. */
function evaluate(profileOverrides = {}, propertyOverrides = {}) {
  const result = evaluateProfile(
    aProperty(propertyOverrides),
    aBuyer(),
    aProfile(profileOverrides),
    [],
    ctx,
  );
  if (result === null) throw new Error("expected a match, got an exclusion");
  return {
    ...result,
    reasonFor: (criterion: string) =>
      result.reasons.find((r) => r.criterion === criterion),
  };
}

describe("location (25)", () => {
  it("earns 25 in one of their suburbs", () => {
    const score = scoreLocation(aProfile(), aProperty());
    expect(score).toMatchObject({ earned: 25, possible: 25 });
    expect(score?.reason).toMatchObject({
      result: "met",
      detail: "In Highton, one of their suburbs",
    });
  });

  it("earns 15 in an also-consider suburb", () => {
    const profile = aProfile({ suburbs: ["Newtown"], alsoConsiderSuburbs: ["Highton"] });
    const score = scoreLocation(profile, aProperty());
    expect(score).toMatchObject({ earned: 15, possible: 25 });
    expect(score?.reason).toMatchObject({
      result: "partial",
      detail: "In Highton, a suburb they'd also consider",
    });
  });

  it("is not scored at all when the buyer set no suburbs", () => {
    const profile = aProfile({ suburbs: [], alsoConsiderSuburbs: [] });
    expect(scoreLocation(profile, aProperty())).toBeNull();
  });
});

describe("price (25)", () => {
  it("earns 25 when the guide sits inside their budget", () => {
    const profile = aProfile({ priceMin: 850_000, priceMax: 980_000 });
    const score = scorePrice(profile, aProperty());
    expect(score).toMatchObject({ earned: 25, possible: 25 });
    expect(score?.reason.result).toBe("met");
  });

  it("earns 20 when the guide overlaps the top of their budget", () => {
    // Guide 880,000-950,000 against a budget topping out at 900,000.
    const profile = aProfile({ priceMin: 700_000, priceMax: 900_000 });
    const score = scorePrice(profile, aProperty());
    expect(score).toMatchObject({ earned: 20, possible: 25 });
    expect(score?.reason.result).toBe("partial");
  });

  it("earns 10 when it is only reachable by stretching", () => {
    const profile = aProfile({ priceMin: 700_000, priceMax: 860_000, stretchMax: 900_000 });
    const score = scorePrice(profile, aProperty());
    expect(score).toMatchObject({ earned: 10, possible: 25 });
    expect(score?.reason).toMatchObject({
      result: "partial",
      detail: "$20,000 over budget, within their stretch",
    });
  });

  it("is unknown when the property has no price guide", () => {
    const score = scorePrice(aProfile(), aProperty({ priceGuideMin: null, priceGuideMax: null }));
    expect(score).toMatchObject({ earned: 0, possible: 0 });
    expect(score?.reason).toMatchObject({
      result: "unknown",
      detail: "No price guide on this property",
    });
  });

  it("misses when the property is below the floor they set", () => {
    const profile = aProfile({ priceMin: 1_200_000, priceMax: null, stretchMax: null });
    const score = scorePrice(profile, aProperty());
    expect(score).toMatchObject({ earned: 0, possible: 25 });
    expect(score?.reason.result).toBe("missed");
  });

  it("is not scored at all when the buyer set no budget", () => {
    const profile = aProfile({ priceMin: null, priceMax: null, stretchMax: null });
    expect(scorePrice(profile, aProperty())).toBeNull();
  });

  it("treats a single-figure guide as both ends of the range", () => {
    const profile = aProfile({ priceMin: 850_000, priceMax: 900_000 });
    const score = scorePrice(profile, aProperty({ priceGuideMin: 880_000, priceGuideMax: null }));
    expect(score).toMatchObject({ earned: 25 });
  });
});

describe("bedrooms (15)", () => {
  it("earns 15 when it meets the minimum", () => {
    const score = scoreBedrooms(aProfile({ bedsMin: 4 }), aProperty({ beds: 4 }));
    expect(score).toMatchObject({ earned: 15, possible: 15 });
    expect(score?.reason.result).toBe("met");
  });

  it("earns 15 when it exceeds the minimum", () => {
    const score = scoreBedrooms(aProfile({ bedsMin: 3 }), aProperty({ beds: 5 }));
    expect(score).toMatchObject({ earned: 15 });
  });

  it("earns 5 when one bedroom short", () => {
    const score = scoreBedrooms(aProfile({ bedsMin: 5 }), aProperty({ beds: 4 }));
    expect(score).toMatchObject({ earned: 5, possible: 15 });
    expect(score?.reason).toMatchObject({ result: "partial", detail: "One bedroom short" });
  });

  it("is unknown when the property has no bedroom count", () => {
    const score = scoreBedrooms(aProfile({ bedsMin: 4 }), aProperty({ beds: null }));
    expect(score).toMatchObject({ earned: 0, possible: 0 });
    expect(score?.reason.result).toBe("unknown");
  });

  it("is not scored at all when the buyer set no minimum", () => {
    expect(scoreBedrooms(aProfile({ bedsMin: null }), aProperty())).toBeNull();
  });
});

describe("bathrooms and car spaces (5 each)", () => {
  it("earns 5 when bathrooms meet the minimum", () => {
    expect(scoreBathrooms(aProfile({ bathsMin: 2 }), aProperty({ baths: 2 }))).toMatchObject({
      earned: 5,
      possible: 5,
    });
  });

  it("earns nothing when bathrooms fall short, with no partial credit", () => {
    const score = scoreBathrooms(aProfile({ bathsMin: 3 }), aProperty({ baths: 2 }));
    expect(score).toMatchObject({ earned: 0, possible: 5 });
    expect(score?.reason).toMatchObject({
      result: "missed",
      detail: "Only 2 bathrooms, they wanted 3",
    });
  });

  it("earns 5 when car spaces meet the minimum", () => {
    expect(scoreCars(aProfile({ carsMin: 2 }), aProperty({ cars: 2 }))).toMatchObject({
      earned: 5,
    });
  });

  it("uses the singular for one car space", () => {
    const score = scoreCars(aProfile({ carsMin: 3 }), aProperty({ cars: 1 }));
    expect(score?.reason.detail).toBe("Only 1 car space, they wanted 3");
  });

  it("is unknown when the count is missing", () => {
    expect(scoreCars(aProfile({ carsMin: 2 }), aProperty({ cars: null }))?.reason.result).toBe(
      "unknown",
    );
  });
});

describe("land size (5)", () => {
  it("earns 5 within the range", () => {
    const profile = aProfile({ landMinSqm: 500, landMaxSqm: 800 });
    expect(scoreLand(profile, aProperty({ landSqm: 620 }))).toMatchObject({ earned: 5 });
  });

  it("misses below the minimum", () => {
    const profile = aProfile({ landMinSqm: 700 });
    const score = scoreLand(profile, aProperty({ landSqm: 620 }));
    expect(score).toMatchObject({ earned: 0, possible: 5 });
    expect(score?.reason.detail).toBe("620 sqm, they wanted at least 700 sqm");
  });

  it("misses above the maximum", () => {
    const profile = aProfile({ landMinSqm: null, landMaxSqm: 400 });
    const score = scoreLand(profile, aProperty({ landSqm: 620 }));
    expect(score?.reason.detail).toBe("620 sqm, they wanted no more than 400 sqm");
  });

  it("is unknown when the property has no land size", () => {
    const profile = aProfile({ landMinSqm: 500 });
    expect(scoreLand(profile, aProperty({ landSqm: null }))?.reason.result).toBe("unknown");
  });

  it("is not scored at all when the buyer set no land size", () => {
    expect(scoreLand(aProfile(), aProperty())).toBeNull();
  });
});

describe("must-haves (15, split evenly)", () => {
  it("earns the full 15 when the property has them all", () => {
    const profile = aProfile({ mustHaves: ["study", "walk_to_school"] });
    const score = scoreMustHaves(profile, aProperty());
    expect(score).toMatchObject({ earned: 15, possible: 15 });
    expect(score?.reason).toMatchObject({
      result: "met",
      detail: "Has all 2 must-haves: study, walk to school",
    });
  });

  it("splits the points evenly when only some are present", () => {
    const profile = aProfile({ mustHaves: ["study", "pool"] });
    const score = scoreMustHaves(profile, aProperty());
    expect(score).toMatchObject({ earned: 7.5, possible: 15 });
    expect(score?.reason).toMatchObject({
      result: "partial",
      detail: "Has 1 of 2 must-haves, missing pool",
    });
  });

  it("splits three ways", () => {
    const profile = aProfile({ mustHaves: ["study", "ensuite", "pool"] });
    expect(scoreMustHaves(profile, aProperty())).toMatchObject({ earned: 10 });
  });

  it("earns nothing when none are present", () => {
    const profile = aProfile({ mustHaves: ["pool", "solar"] });
    const score = scoreMustHaves(profile, aProperty());
    expect(score).toMatchObject({ earned: 0, possible: 15 });
    expect(score?.reason.result).toBe("missed");
  });

  it("reads naturally for a single must-have", () => {
    expect(
      scoreMustHaves(aProfile({ mustHaves: ["study"] }), aProperty())?.reason.detail,
    ).toBe("Has their must-have: study");
    expect(
      scoreMustHaves(aProfile({ mustHaves: ["pool"] }), aProperty())?.reason.detail,
    ).toBe("No pool");
  });

  it("is not scored at all when the buyer listed none", () => {
    expect(scoreMustHaves(aProfile({ mustHaves: [] }), aProperty())).toBeNull();
  });

  it("counts a property with no features recorded as missed, not unknown", () => {
    const profile = aProfile({ mustHaves: ["study"] });
    expect(scoreMustHaves(profile, aProperty({ features: [] }))?.reason.result).toBe("missed");
  });
});

describe("nice-to-haves (5, split evenly)", () => {
  it("earns the full 5 when all are present", () => {
    const profile = aProfile({ niceToHaves: ["ensuite"] });
    expect(scoreNiceToHaves(profile, aProperty())).toMatchObject({ earned: 5, possible: 5 });
  });

  it("splits evenly", () => {
    const profile = aProfile({ niceToHaves: ["ensuite", "pool"] });
    expect(scoreNiceToHaves(profile, aProperty())).toMatchObject({ earned: 2.5 });
  });
});

describe("the overall score", () => {
  it("is 100 when every criterion the buyer set is met", () => {
    const result = evaluate({
      suburbs: ["Highton"],
      priceMin: 850_000,
      priceMax: 980_000,
      bedsMin: 4,
      bathsMin: 2,
      carsMin: 2,
      mustHaves: ["study"],
    });
    expect(result.score).toBe(100);
    expect(result.metCount).toBe(6);
    expect(result.setCount).toBe(6);
  });

  it("only counts criteria the buyer actually set", () => {
    // Land is never mentioned, so it can neither help nor hurt.
    const result = evaluate({ landMinSqm: null, landMaxSqm: null });
    expect(result.reasons.map((r) => r.criterion)).not.toContain("land");
  });

  it("leaves unknown criteria out of the score but still reports them", () => {
    const result = evaluate({}, { priceGuideMin: null, priceGuideMax: null });
    // Location, bedrooms, bathrooms and cars are all met; price is unknown.
    expect(result.score).toBe(100);
    expect(result.reasonFor("price")?.result).toBe("unknown");
    // An unknown still counts as something the buyer asked for.
    expect(result.setCount).toBe(5);
    expect(result.metCount).toBe(4);
  });

  it("scores 0 rather than dividing by zero when nothing can be answered", () => {
    const result = evaluate(
      { priceMin: 850_000, priceMax: 980_000, bedsMin: null, bathsMin: null, carsMin: null, suburbs: [] },
      { priceGuideMin: null, priceGuideMax: null },
    );
    expect(result.score).toBe(0);
    expect(result.setCount).toBe(1);
  });

  it("works the worked example from the brief discussion", () => {
    // Fiona Macardle against 18 Kerrisdale Court: five clean yeses, a stretch
    // on price, and a nice-to-have the property doesn't have.
    const result = evaluate({
      suburbs: ["Highton"],
      alsoConsiderSuburbs: ["Belmont"],
      priceMin: 700_000,
      priceMax: 860_000,
      stretchMax: 900_000,
      bedsMin: 3,
      bathsMin: 1,
      carsMin: 1,
      mustHaves: ["walk_to_school"],
      niceToHaves: ["low_maintenance_yard"],
      dealBreakers: ["pool", "main_road"],
    });

    expect(result.score).toBe(79);
    expect(result.metCount).toBe(5);
    expect(result.setCount).toBe(7);
    expect(fitSummary(result)).toBe("Fits 5 of 7");
    expect(result.reasonFor("price")).toMatchObject({
      result: "partial",
      detail: "$20,000 over budget, within their stretch",
    });
  });
});

describe("metCount is strict", () => {
  it("does not count a partial as a fit", () => {
    const result = evaluate({ bedsMin: 5 });
    expect(result.reasonFor("bedrooms")?.result).toBe("partial");
    expect(result.metCount).toBe(4); // location, price, bathrooms, cars
    expect(result.setCount).toBe(5); // the fifth is the partial bedroom count
  });
});

describe("reasons (8.3)", () => {
  it("returns one reason per criterion the buyer set, in a stable order", () => {
    const result = evaluate({ landMinSqm: 500, mustHaves: ["study"], niceToHaves: ["ensuite"] });
    expect(result.reasons.map((r) => r.criterion)).toEqual([
      "location",
      "price",
      "bedrooms",
      "bathrooms",
      "cars",
      "land",
      "must_haves",
      "nice_to_haves",
    ]);
  });

  it("gives every reason a label and a non-empty plain English detail", () => {
    const result = evaluate({ landMinSqm: 500, mustHaves: ["study"] });
    for (const reason of result.reasons) {
      expect(reason.label.length).toBeGreaterThan(0);
      expect(reason.detail.length).toBeGreaterThan(0);
      // Sentence case, not all-caps or a bare slug.
      expect(reason.detail).not.toMatch(/_/);
    }
  });

  it("writes dollar amounts in whole dollars with commas", () => {
    const result = evaluate({ priceMin: 700_000, priceMax: 860_000, stretchMax: 900_000 });
    expect(result.reasonFor("price")?.detail).toMatch(/\$\d{1,3}(,\d{3})*/);
    expect(result.reasonFor("price")?.detail).not.toMatch(/\./);
  });
});
