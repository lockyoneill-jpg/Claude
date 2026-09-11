"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveBuyer, type SaveBuyerState } from "@/lib/actions";
import {
  BUYER_SOURCES,
  BUYER_SOURCE_LABELS,
  BUYER_STATUSES,
  BUYER_STATUS_LABELS,
  FINANCE_LABELS,
  FINANCE_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  TIMEFRAMES,
  TIMEFRAME_LABELS,
} from "@/lib/domain";
import { FEATURE_GROUPS } from "@/lib/features";

export type BuyerFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerName: string;
  assignedAgentId: string;
  source: string;
  status: string;
  finance: string;
  preApprovalRecordedOn: string;
  timeframe: string;
  needsToSell: "yes" | "no" | "unknown";
  briefText: string;
  profileName: string;
  suburbs: string;
  alsoConsiderSuburbs: string;
  propertyTypes: string[];
  priceMin: string;
  priceMax: string;
  stretchMax: string;
  bedsMin: string;
  bathsMin: string;
  carsMin: string;
  landMinSqm: string;
  landMaxSqm: string;
  mustHaves: string[];
  niceToHaves: string[];
  dealBreakers: string[];
};

const INPUT =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 text-base text-ink placeholder:text-muted";
const LABEL = "block text-sm font-semibold text-ink";

/**
 * Add and edit a buyer (section 9).
 *
 * Nothing saves on its own — the agent fills this in and presses "Save buyer".
 * When "Fill in from brief" arrives in Session 6 it only ever pre-fills these
 * fields, and this form stays the single way a buyer is written.
 */
export function BuyerForm({
  buyerId,
  profileId,
  agents,
  values,
}: {
  buyerId: string | null;
  profileId: string | null;
  agents: { id: string; name: string }[];
  values: BuyerFormValues;
}) {
  const action = saveBuyer.bind(null, buyerId, profileId);
  const [state, formAction, pending] = useActionState<SaveBuyerState, FormData>(
    action,
    { error: null },
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6 pb-10">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-brick bg-brick-tint px-4 py-3 text-base text-ink"
        >
          {state.error}
        </p>
      )}

      {/* The brief in their own words comes first — it is what the agent
          actually heard, and in Session 6 it is what the AI reads. */}
      <Section title="Their brief">
        <div>
          <label htmlFor="briefText" className={LABEL}>
            In their own words
          </label>
          <textarea
            id="briefText"
            name="briefText"
            rows={5}
            defaultValue={values.briefText}
            placeholder="Upsizing from Belmont now the third one has arrived. Wants to stay for the school zone, needs a study, would stretch for something already done up."
            className={`${INPUT} mt-1`}
          />
          <p className="mt-1 text-sm text-muted">
            Anything they want that isn&apos;t a tick box below belongs here.
          </p>
        </div>
      </Section>

      <Section title="Contact">
        <Grid>
          <Field id="firstName" label="First name">
            <input
              id="firstName"
              name="firstName"
              required
              defaultValue={values.firstName}
              className={INPUT}
            />
          </Field>
          <Field id="lastName" label="Last name">
            <input
              id="lastName"
              name="lastName"
              required
              defaultValue={values.lastName}
              className={INPUT}
            />
          </Field>
          <Field id="phone" label="Phone">
            <input id="phone" name="phone" defaultValue={values.phone} className={INPUT} />
          </Field>
          <Field id="email" label="Email">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={values.email}
              className={INPUT}
            />
          </Field>
          <Field id="partnerName" label="Partner's name">
            <input
              id="partnerName"
              name="partnerName"
              defaultValue={values.partnerName}
              className={INPUT}
            />
          </Field>
          <Field id="assignedAgentId" label="Assigned agent">
            <select
              id="assignedAgentId"
              name="assignedAgentId"
              defaultValue={values.assignedAgentId}
              className={INPUT}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Readiness">
        <Grid>
          <Field id="status" label="Status">
            <Select id="status" name="status" defaultValue={values.status}>
              {BUYER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BUYER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="source" label="Where they came from">
            <Select id="source" name="source" defaultValue={values.source}>
              {BUYER_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {BUYER_SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="finance" label="Finance">
            <Select id="finance" name="finance" defaultValue={values.finance}>
              {FINANCE_STATUSES.map((f) => (
                <option key={f} value={f}>
                  {FINANCE_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="preApprovalRecordedOn"
            label="Pre-approval, date they told you"
            hint="We'll prompt you to re-confirm it after three months."
          >
            <input
              id="preApprovalRecordedOn"
              name="preApprovalRecordedOn"
              type="date"
              defaultValue={values.preApprovalRecordedOn}
              className={INPUT}
            />
          </Field>
          <Field id="timeframe" label="Timeframe">
            <Select id="timeframe" name="timeframe" defaultValue={values.timeframe}>
              {TIMEFRAMES.map((t) => (
                <option key={t} value={t}>
                  {TIMEFRAME_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="needsToSell" label="Needs to sell first">
            <Select id="needsToSell" name="needsToSell" defaultValue={values.needsToSell}>
              <option value="unknown">Not asked</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section
        title="What they're looking for"
        hint="Leave anything blank if they didn't say. A blank criterion is never counted against a property."
      >
        <Grid>
          <Field id="profileName" label="Profile name">
            <input
              id="profileName"
              name="profileName"
              defaultValue={values.profileName}
              className={INPUT}
            />
          </Field>
          <div />
          <Field id="suburbs" label="Suburbs" hint="Separate with commas.">
            <input id="suburbs" name="suburbs" defaultValue={values.suburbs} className={INPUT} />
          </Field>
          <Field
            id="alsoConsiderSuburbs"
            label="Would also consider"
            hint="Separate with commas."
          >
            <input
              id="alsoConsiderSuburbs"
              name="alsoConsiderSuburbs"
              defaultValue={values.alsoConsiderSuburbs}
              className={INPUT}
            />
          </Field>
          <Field id="priceMin" label="Budget from">
            <input id="priceMin" name="priceMin" defaultValue={values.priceMin} className={INPUT} />
          </Field>
          <Field id="priceMax" label="Budget to">
            <input id="priceMax" name="priceMax" defaultValue={values.priceMax} className={INPUT} />
          </Field>
          <Field
            id="stretchMax"
            label="Would stretch to"
            hint="For the right place."
          >
            <input
              id="stretchMax"
              name="stretchMax"
              defaultValue={values.stretchMax}
              className={INPUT}
            />
          </Field>
          <div />
          <Field id="bedsMin" label="Bedrooms, minimum">
            <input id="bedsMin" name="bedsMin" defaultValue={values.bedsMin} className={INPUT} />
          </Field>
          <Field id="bathsMin" label="Bathrooms, minimum">
            <input id="bathsMin" name="bathsMin" defaultValue={values.bathsMin} className={INPUT} />
          </Field>
          <Field id="carsMin" label="Car spaces, minimum">
            <input id="carsMin" name="carsMin" defaultValue={values.carsMin} className={INPUT} />
          </Field>
          <div />
          <Field id="landMinSqm" label="Land from, sqm">
            <input
              id="landMinSqm"
              name="landMinSqm"
              defaultValue={values.landMinSqm}
              className={INPUT}
            />
          </Field>
          <Field id="landMaxSqm" label="Land to, sqm">
            <input
              id="landMaxSqm"
              name="landMaxSqm"
              defaultValue={values.landMaxSqm}
              className={INPUT}
            />
          </Field>
        </Grid>

        <fieldset className="mt-4">
          <legend className={LABEL}>Property types</legend>
          <p className="mt-0.5 mb-2 text-sm text-muted">
            Tick every type they&apos;d consider. Leave all unticked for no
            preference.
          </p>
          <div className="flex flex-wrap gap-3">
            {PROPERTY_TYPES.map((t) => (
              <Check
                key={t}
                name="propertyTypes"
                value={t}
                label={PROPERTY_TYPE_LABELS[t]}
                defaultChecked={values.propertyTypes.includes(t)}
              />
            ))}
          </div>
        </fieldset>
      </Section>

      <Section
        title="Features"
        hint="Deal breakers rule a property out completely. Must-haves and nice-to-haves affect the score."
      >
        <FeaturePicker
          name="mustHaves"
          legend="Must have"
          selected={values.mustHaves}
        />
        <FeaturePicker
          name="niceToHaves"
          legend="Nice to have"
          selected={values.niceToHaves}
        />
        <FeaturePicker
          name="dealBreakers"
          legend="Deal breakers"
          selected={values.dealBreakers}
        />
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gum px-5 py-2.5 text-base font-semibold text-white hover:bg-[#275948] disabled:opacity-60"
        >
          {pending ? "Saving buyer" : "Save buyer"}
        </button>
        <Link
          href={buyerId ? `/buyers/${buyerId}` : "/buyers"}
          className="rounded-md border border-rule px-5 py-2.5 text-base font-semibold text-ink hover:bg-paper"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * Form furniture
 * ---------------------------------------------------------------------- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-surface p-5">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={INPUT}>
      {children}
    </select>
  );
}

function Check({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-rule accent-gum"
      />
      {label}
    </label>
  );
}

function FeaturePicker({
  name,
  legend,
  selected,
}: {
  name: string;
  legend: string;
  selected: string[];
}) {
  return (
    <fieldset className="mb-4 last:mb-0">
      <legend className={LABEL}>{legend}</legend>
      <div className="mt-2 space-y-2">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="w-40 shrink-0 text-sm text-muted">{group.label}</span>
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
              {group.features.map((f) => (
                <Check
                  key={f.slug}
                  name={name}
                  value={f.slug}
                  label={f.label}
                  defaultChecked={selected.includes(f.slug)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
