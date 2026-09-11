/**
 * Feature vocabulary (brief section 7).
 *
 * Matching only works reliably if buyers and properties describe features with
 * the SAME words. So features are a fixed list of slugs — never free text.
 *
 * Anything a buyer wants that isn't on this list belongs in `brief_text`,
 * not in a new slug. Adding a slug here is a product decision, not a code one.
 */

export const FEATURE_GROUPS = [
  {
    label: "Home layout",
    features: [
      { slug: "pool", label: "Pool" },
      { slug: "north_facing", label: "North facing" },
      { slug: "study", label: "Study" },
      { slug: "home_office", label: "Home office" },
      { slug: "second_living", label: "Second living area" },
      { slug: "ensuite", label: "Ensuite" },
      { slug: "walk_in_robe", label: "Walk-in robe" },
      { slug: "single_level", label: "Single level" },
      { slug: "double_storey", label: "Double storey" },
      { slug: "granny_flat", label: "Granny flat" },
    ],
  },
  {
    label: "Parking and outdoor",
    features: [
      { slug: "garage", label: "Garage" },
      { slug: "shed_workshop", label: "Shed or workshop" },
      { slug: "side_access", label: "Side access" },
    ],
  },
  {
    label: "Comfort and efficiency",
    features: [
      { slug: "solar", label: "Solar" },
      { slug: "ducted_heating_cooling", label: "Ducted heating and cooling" },
    ],
  },
  {
    label: "Condition",
    features: [
      { slug: "renovated", label: "Renovated" },
      { slug: "needs_renovation", label: "Needs renovation" },
    ],
  },
  {
    label: "Yard",
    features: [
      { slug: "established_garden", label: "Established garden" },
      { slug: "low_maintenance_yard", label: "Low maintenance yard" },
    ],
  },
  {
    label: "Location",
    features: [
      { slug: "water_views", label: "Water views" },
      { slug: "walk_to_beach", label: "Walk to beach" },
      { slug: "walk_to_school", label: "Walk to school" },
      { slug: "walk_to_shops", label: "Walk to shops" },
      { slug: "walk_to_station", label: "Walk to station" },
      { slug: "quiet_street", label: "Quiet street" },
      { slug: "corner_block", label: "Corner block" },
      // Mainly here so it can be used as a deal breaker.
      { slug: "main_road", label: "Main road" },
    ],
  },
] as const;

export type FeatureSlug =
  (typeof FEATURE_GROUPS)[number]["features"][number]["slug"];

/** Every valid feature slug, flattened. */
export const FEATURE_SLUGS = FEATURE_GROUPS.flatMap((group) =>
  group.features.map((feature) => feature.slug),
) as FeatureSlug[];

const LABEL_BY_SLUG = new Map<string, string>(
  FEATURE_GROUPS.flatMap((group) =>
    group.features.map((feature) => [feature.slug, feature.label] as const),
  ),
);

/** Display label for a slug. Falls back to the slug so nothing renders blank. */
export function featureLabel(slug: string): string {
  return LABEL_BY_SLUG.get(slug) ?? slug;
}
