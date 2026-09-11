/**
 * Hard excludes — brief section 8.1.
 *
 * Every rule in that list gets a test, plus a test that the rule does NOT
 * fire when it shouldn't.
 */

import { describe, expect, it } from "vitest";

import { evaluateProfile, exclusionFor } from "./index.ts";
import { aBuyer, aProfile, aProperty, NOW } from "./fixtures.ts";

const ctx = { now: NOW };

function exclusion(
  property = aProperty(),
  buyer = aBuyer(),
  profile = aProfile(),
  feedback = [],
) {
  return exclusionFor(property, buyer, profile, feedback);
}

describe("hard excludes (8.1)", () => {
  it("includes an eligible buyer", () => {
    expect(exclusion()).toBeNull();
    expect(evaluateProfile(aProperty(), aBuyer(), aProfile(), [], ctx)).not.toBeNull();
  });

  describe("buyer is closed out", () => {
    it.each(["purchased", "bought_elsewhere", "not_proceeding"] as const)(
      "excludes a buyer whose status is %s",
      (status) => {
        expect(exclusion(aProperty(), aBuyer({ status }))).toBe("buyer_closed");
      },
    );

    it.each(["new_enquiry", "looking", "inspecting", "offer_made", "under_contract"] as const)(
      "keeps a buyer whose status is %s",
      (status) => {
        expect(exclusion(aProperty(), aBuyer({ status }))).toBeNull();
      },
    );

    it("keeps paused buyers, who are still in the market", () => {
      expect(exclusion(aProperty(), aBuyer({ status: "paused" }))).toBeNull();
    });
  });

  it("excludes an archived buyer", () => {
    const buyer = aBuyer({ archivedAt: new Date("2026-01-01T00:00:00Z") });
    expect(exclusion(aProperty(), buyer)).toBe("buyer_archived");
  });

  it("excludes an inactive profile", () => {
    expect(exclusion(aProperty(), aBuyer(), aProfile({ active: false }))).toBe(
      "profile_inactive",
    );
  });

  describe("property availability", () => {
    it.each(["sold", "withdrawn"] as const)("excludes a %s property", (listingStatus) => {
      expect(exclusion(aProperty({ listingStatus }))).toBe("property_unavailable");
    });

    it.each(["off_market", "pre_market", "on_market", "under_offer"] as const)(
      "keeps a %s property",
      (listingStatus) => {
        expect(exclusion(aProperty({ listingStatus }))).toBeNull();
      },
    );
  });

  describe("property type", () => {
    it("excludes a type the buyer didn't ask for", () => {
      const profile = aProfile({ propertyTypes: ["unit", "townhouse"] });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBe("property_type");
    });

    it("keeps any type when the buyer set none", () => {
      const profile = aProfile({ propertyTypes: [] });
      expect(exclusion(aProperty({ propertyType: "land" }), aBuyer(), profile)).toBeNull();
    });
  });

  describe("deal breakers", () => {
    it("excludes a property with one of the buyer's deal breakers", () => {
      const property = aProperty({ features: ["main_road", "garage"] });
      const profile = aProfile({ dealBreakers: ["main_road"] });
      expect(exclusion(property, aBuyer(), profile)).toBe("deal_breaker");
    });

    it("keeps a property that has none of them", () => {
      const profile = aProfile({ dealBreakers: ["pool", "main_road"] });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBeNull();
    });
  });

  describe("suburb", () => {
    it("excludes a suburb in neither list", () => {
      const profile = aProfile({ suburbs: ["Torquay"], alsoConsiderSuburbs: ["Jan Juc"] });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBe("suburb");
    });

    it("keeps an also-consider suburb", () => {
      const profile = aProfile({ suburbs: ["Torquay"], alsoConsiderSuburbs: ["Highton"] });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBeNull();
    });

    it("keeps any suburb when the buyer set none", () => {
      const profile = aProfile({ suburbs: [], alsoConsiderSuburbs: [] });
      expect(exclusion(aProperty({ suburb: "Lara" }), aBuyer(), profile)).toBeNull();
    });
  });

  describe("over budget", () => {
    it("excludes when the guide is above their max and there is no stretch", () => {
      const profile = aProfile({ priceMax: 800_000, stretchMax: null });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBe("over_budget");
    });

    it("excludes when the guide is above their stretch", () => {
      const profile = aProfile({ priceMax: 800_000, stretchMax: 850_000 });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBe("over_budget");
    });

    it("keeps them when the guide is within the stretch", () => {
      const profile = aProfile({ priceMax: 860_000, stretchMax: 900_000 });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBeNull();
    });

    it("uses the stretch as the ceiling, not the max", () => {
      // Guide starts at 880,000: over the 860,000 max but under the stretch.
      const profile = aProfile({ priceMin: 700_000, priceMax: 860_000, stretchMax: 900_000 });
      expect(exclusion(aProperty(), aBuyer(), profile)).toBeNull();
    });

    it("keeps a property with no price guide, whatever the budget", () => {
      const property = aProperty({ priceGuideMin: null, priceGuideMax: null });
      const profile = aProfile({ priceMax: 500_000 });
      expect(exclusion(property, aBuyer(), profile)).toBeNull();
    });
  });

  describe("bedrooms", () => {
    it("excludes a property two or more bedrooms short", () => {
      const profile = aProfile({ bedsMin: 6 });
      expect(exclusion(aProperty({ beds: 4 }), aBuyer(), profile)).toBe("too_few_bedrooms");
    });

    it("keeps a property one bedroom short", () => {
      const profile = aProfile({ bedsMin: 5 });
      expect(exclusion(aProperty({ beds: 4 }), aBuyer(), profile)).toBeNull();
    });

    it("keeps a property with no bedroom count recorded", () => {
      const profile = aProfile({ bedsMin: 6 });
      expect(exclusion(aProperty({ beds: null }), aBuyer(), profile)).toBeNull();
    });
  });

  describe("match feedback", () => {
    it.each(["dismissed", "not_interested"] as const)(
      "excludes a buyer with %s feedback on this property",
      (state) => {
        const feedback = [{ buyerId: "buyer-1", propertyId: "property-1", state }];
        expect(exclusionFor(aProperty(), aBuyer(), aProfile(), feedback)).toBe("dismissed");
      },
    );

    it.each(["shortlisted", "inspected"] as const)("keeps a buyer with %s feedback", (state) => {
      const feedback = [{ buyerId: "buyer-1", propertyId: "property-1", state }];
      expect(exclusionFor(aProperty(), aBuyer(), aProfile(), feedback)).toBeNull();
    });

    it("ignores feedback about a different property", () => {
      const feedback = [
        { buyerId: "buyer-1", propertyId: "property-2", state: "dismissed" as const },
      ];
      expect(exclusionFor(aProperty(), aBuyer(), aProfile(), feedback)).toBeNull();
    });

    it("ignores another buyer's feedback on this property", () => {
      const feedback = [
        { buyerId: "buyer-9", propertyId: "property-1", state: "dismissed" as const },
      ];
      expect(exclusionFor(aProperty(), aBuyer(), aProfile(), feedback)).toBeNull();
    });
  });

  it("returns null from evaluateProfile for an excluded pairing", () => {
    const profile = aProfile({ dealBreakers: ["study"] });
    expect(evaluateProfile(aProperty(), aBuyer(), profile, [], ctx)).toBeNull();
  });
});
