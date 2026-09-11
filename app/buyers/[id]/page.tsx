import Link from "next/link";
import { notFound } from "next/navigation";

import {
  LogContactButton,
  NoteBox,
  StatusSelector,
} from "@/components/buyer-actions";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/page-header";
import { CheckInFlag } from "@/components/status-pill";
import { getCurrentAgency } from "@/lib/agency";
import { getBuyerDetail } from "@/lib/buyers";
import {
  ACTIVITY_TYPE_LABELS,
  BUYER_SOURCE_LABELS,
  FINANCE_LABELS,
  PROPERTY_TYPE_LABELS,
  TIMEFRAME_LABELS,
  type PropertyType,
} from "@/lib/domain";
import { featureLabel } from "@/lib/features";
import {
  formatBudget,
  formatDate,
  formatLastContacted,
  formatSuburbs,
  needsCheckIn,
} from "@/lib/format";
import { preApprovalNeedsReconfirming } from "@/lib/matching";
import { toMatchBuyer } from "@/lib/matching/from-db";
import { matchesForBuyer } from "@/lib/matching-data";

export const dynamic = "force-dynamic";

export default async function BuyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const agency = await getCurrentAgency();
  const detail = await getBuyerDetail(agency.id, id);

  if (!detail) notFound();

  const { buyer, agent, profiles, timeline } = detail;
  const activeProfiles = profiles.filter((p) => p.active);

  // One profile at a time, with a switcher when there's more than one.
  const requested = Array.isArray(search.profile)
    ? search.profile[0]
    : search.profile;
  const profile =
    activeProfiles.find((p) => p.id === requested) ?? activeProfiles[0] ?? null;

  const matches = profile
    ? await matchesForBuyer(agency.id, buyer.id, { profileId: profile.id })
    : [];

  const flagged = needsCheckIn(buyer.status, buyer.lastContactedAt, buyer.createdAt);
  const reconfirm = preApprovalNeedsReconfirming(toMatchBuyer(buyer, []));

  return (
    <>
      <PageHeader
        title={`${buyer.firstName} ${buyer.lastName}`}
        description={
          buyer.phone || buyer.email ? (
            <span className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {buyer.phone && (
                <a
                  href={`tel:${buyer.phone.replace(/\s/g, "")}`}
                  className="text-ink underline-offset-2 hover:underline"
                >
                  {buyer.phone}
                </a>
              )}
              {buyer.email && (
                <a
                  href={`mailto:${buyer.email}`}
                  className="text-ink underline-offset-2 hover:underline"
                >
                  {buyer.email}
                </a>
              )}
            </span>
          ) : undefined
        }
        back={
          <Link href="/buyers" className="text-muted hover:text-ink">
            Buyers
          </Link>
        }
        action={
          <div className="flex items-center gap-3">
            <StatusSelector buyerId={buyer.id} status={buyer.status} />
            <Link
              href={`/buyers/${buyer.id}/edit`}
              className="rounded-md border border-rule px-3 py-2 text-base font-semibold text-ink hover:bg-paper"
            >
              Edit buyer
            </Link>
            <LogContactButton buyerId={buyer.id} />
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 px-8 py-6">
        {/* ---- Left: readiness, brief, profile, timeline ---------------- */}
        <div className="space-y-6">
          <Panel title="Readiness">
            <dl className="space-y-2 text-sm">
              <Row label="Finance">
                {FINANCE_LABELS[buyer.finance]}
                {reconfirm && (
                  <span className="ml-2 rounded-full bg-wattle-tint px-2 py-0.5 text-sm font-semibold text-ink">
                    Re-confirm
                  </span>
                )}
              </Row>
              {buyer.preApprovalRecordedOn && (
                <Row label="Told us">
                  {formatDate(new Date(`${buyer.preApprovalRecordedOn}T00:00:00Z`))}
                </Row>
              )}
              <Row label="Timeframe">{TIMEFRAME_LABELS[buyer.timeframe]}</Row>
              <Row label="Needs to sell">
                {buyer.needsToSell === null
                  ? "Not asked"
                  : buyer.needsToSell
                    ? "Yes"
                    : "No"}
              </Row>
              <Row label="Agent">{agent?.name ?? "Unassigned"}</Row>
              <Row label="Source">{BUYER_SOURCE_LABELS[buyer.source]}</Row>
              <Row label="Last contacted">
                <span className="inline-flex items-center gap-2">
                  {formatLastContacted(buyer.lastContactedAt)}
                  {flagged && <CheckInFlag />}
                </span>
              </Row>
            </dl>
          </Panel>

          {buyer.briefText && (
            <Panel title="Their brief">
              <p className="whitespace-pre-wrap text-base text-ink">
                {buyer.briefText}
              </p>
            </Panel>
          )}

          <Panel
            title="Search profile"
            action={
              <Link
                href={`/buyers/${buyer.id}/edit`}
                className="text-sm font-semibold text-gum hover:underline"
              >
                Edit
              </Link>
            }
          >
            {activeProfiles.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {activeProfiles.map((p) => (
                  <Link
                    key={p.id}
                    href={`/buyers/${buyer.id}?profile=${p.id}`}
                    aria-current={p.id === profile?.id ? "true" : undefined}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      p.id === profile?.id
                        ? "border-gum bg-gum-tint font-semibold text-gum"
                        : "border-rule text-ink hover:bg-paper"
                    }`}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            )}

            {profile ? (
              <dl className="space-y-2 text-sm">
                <Row label="Suburbs">{formatSuburbs(profile.suburbs, 4)}</Row>
                {profile.alsoConsiderSuburbs.length > 0 && (
                  <Row label="Also consider">
                    {formatSuburbs(profile.alsoConsiderSuburbs, 4)}
                  </Row>
                )}
                <Row label="Budget">
                  {formatBudget(
                    profile.priceMin,
                    profile.priceMax,
                    profile.stretchMax,
                  )}
                </Row>
                <Row label="Type">
                  {profile.propertyTypes.length === 0
                    ? "Any"
                    : profile.propertyTypes
                        .map((t) => PROPERTY_TYPE_LABELS[t as PropertyType] ?? t)
                        .join(", ")}
                </Row>
                <Row label="Minimum">
                  {[
                    profile.bedsMin === null ? null : `${profile.bedsMin} bed`,
                    profile.bathsMin === null ? null : `${profile.bathsMin} bath`,
                    profile.carsMin === null ? null : `${profile.carsMin} car`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not set"}
                </Row>
                {(profile.landMinSqm !== null || profile.landMaxSqm !== null) && (
                  <Row label="Land">
                    {profile.landMinSqm !== null && profile.landMaxSqm !== null
                      ? `${profile.landMinSqm} to ${profile.landMaxSqm} sqm`
                      : profile.landMinSqm !== null
                        ? `At least ${profile.landMinSqm} sqm`
                        : `Up to ${profile.landMaxSqm} sqm`}
                  </Row>
                )}
                <FeatureRow label="Must have" slugs={profile.mustHaves} />
                <FeatureRow label="Nice to have" slugs={profile.niceToHaves} />
                <FeatureRow label="Deal breakers" slugs={profile.dealBreakers} />
              </dl>
            ) : (
              <p className="text-base text-muted">
                No search profile yet. Edit this buyer to add what they&apos;re
                looking for, and their matches will appear.
              </p>
            )}
          </Panel>

          <Panel title="Activity">
            <NoteBox buyerId={buyer.id} />
            {timeline.length === 0 ? (
              <p className="text-base text-muted">
                Nothing logged yet. Add a note, or press Log contact after you
                speak to them.
              </p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-rule pl-3 text-sm"
                  >
                    <p className="text-ink">{entry.body}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {ACTIVITY_TYPE_LABELS[entry.type]}
                      {" — "}
                      {formatDate(entry.createdAt)}
                      {entry.agentName ? ` by ${entry.agentName}` : ""}
                      {entry.propertyAddress ? ` — ${entry.propertyAddress}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* ---- Right: matched properties -------------------------------- */}
        <div>
          <h2 className="mb-3 text-xl font-semibold text-ink">
            Matched properties{" "}
            <span className="text-base font-normal text-muted">
              {matches.length === 1 ? "1 match" : `${matches.length} matches`}
              {activeProfiles.length > 1 && profile && ` for ${profile.name}`}
            </span>
          </h2>

          {matches.length === 0 ? (
            <div className="rounded-lg border border-rule bg-surface p-6">
              <p className="text-base text-muted">
                No matches yet. Widen the price or suburbs on this buyer&apos;s
                profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(({ property, result, feedback }) => (
                <MatchCard
                  key={property.id}
                  buyerId={buyer.id}
                  propertyId={property.id}
                  addressLine={property.addressLine}
                  suburb={property.suburb}
                  priceDisplay={property.priceDisplay}
                  listingStatus={property.listingStatus}
                  beds={property.beds}
                  baths={property.baths}
                  cars={property.cars}
                  score={result.score}
                  metCount={result.metCount}
                  setCount={result.setCount}
                  reasons={result.reasons}
                  feedbackState={feedback?.state ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Small presentational pieces
 * ---------------------------------------------------------------------- */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

function FeatureRow({ label, slugs }: { label: string; slugs: string[] }) {
  if (slugs.length === 0) return null;
  return (
    <Row label={label}>{slugs.map((s) => featureLabel(s)).join(", ")}</Row>
  );
}
