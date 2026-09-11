import type { Buyer, SearchProfile } from "@/db/schema";
import type { BuyerFormValues } from "@/components/buyer-form";

const EMPTY: BuyerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  partnerName: "",
  assignedAgentId: "",
  source: "portal_enquiry",
  status: "new_enquiry",
  finance: "unknown",
  preApprovalRecordedOn: "",
  timeframe: "unknown",
  needsToSell: "unknown",
  briefText: "",
  profileName: "Search profile",
  suburbs: "",
  alsoConsiderSuburbs: "",
  propertyTypes: [],
  priceMin: "",
  priceMax: "",
  stretchMax: "",
  bedsMin: "",
  bathsMin: "",
  carsMin: "",
  landMinSqm: "",
  landMaxSqm: "",
  mustHaves: [],
  niceToHaves: [],
  dealBreakers: [],
};

export function emptyBuyerForm(): BuyerFormValues {
  return { ...EMPTY };
}

const str = (v: string | number | null) => (v === null ? "" : String(v));

export function buyerFormValues(
  buyer: Buyer,
  profile: SearchProfile | null,
): BuyerFormValues {
  return {
    firstName: buyer.firstName,
    lastName: buyer.lastName,
    email: str(buyer.email),
    phone: str(buyer.phone),
    partnerName: str(buyer.partnerName),
    assignedAgentId: str(buyer.assignedAgentId),
    source: buyer.source,
    status: buyer.status,
    finance: buyer.finance,
    preApprovalRecordedOn: str(buyer.preApprovalRecordedOn),
    timeframe: buyer.timeframe,
    needsToSell:
      buyer.needsToSell === null ? "unknown" : buyer.needsToSell ? "yes" : "no",
    briefText: str(buyer.briefText),
    profileName: profile?.name ?? "Search profile",
    suburbs: profile?.suburbs.join(", ") ?? "",
    alsoConsiderSuburbs: profile?.alsoConsiderSuburbs.join(", ") ?? "",
    propertyTypes: profile?.propertyTypes ?? [],
    priceMin: str(profile?.priceMin ?? null),
    priceMax: str(profile?.priceMax ?? null),
    stretchMax: str(profile?.stretchMax ?? null),
    bedsMin: str(profile?.bedsMin ?? null),
    bathsMin: str(profile?.bathsMin ?? null),
    carsMin: str(profile?.carsMin ?? null),
    landMinSqm: str(profile?.landMinSqm ?? null),
    landMaxSqm: str(profile?.landMaxSqm ?? null),
    mustHaves: profile?.mustHaves ?? [],
    niceToHaves: profile?.niceToHaves ?? [],
    dealBreakers: profile?.dealBreakers ?? [],
  };
}
