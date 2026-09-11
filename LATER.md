# Later

Ideas and questions that came up while building Phase 1. Nothing here is being
built now. Phases refer to the table in `BRIEF.md` section 2.

---

## Already planned in the brief

These are scoped in the brief and listed here only so the reasoning captured
while building isn't lost.

- **Phase 2 — REAXML import.** The schema already carries `properties.source`
  (`manual` | `reaxml`) and `properties.external_id`, unique per agency, so the
  importer can upsert without touching existing rows.
- **Phase 3 — Enquiry intake and open home QR check-in.** `buyers.source`
  already has `portal_enquiry` and `open_home` values.
- **Phase 4 — Email and SMS sends.** `buyers` already carries `email_consent`,
  `sms_consent`, `consent_source` and `consent_at` for Spam Act compliance.
  The seed fills these in plausibly; nothing in Phase 1 reads them.
- **Phase 5 — Agency accounts and logins.** Every table already has
  `agency_id` and every query filters by it. `lib/agency.ts` is the only place
  that decides "which agency", so that's the seam to change.
- **Phase 6 — Buyer portal.** `buyers.buyer_account_id` is reserved for it.

---

## Ideas raised while building

- **Caching match results.** Phase 1 computes matches on page load, which the
  brief confirms is fine to roughly 5,000 profiles. `lib/matching` is a pure
  function with no database access, so a cache can wrap it later without the
  engine changing. Marked in code when Session 2 builds it.
- **Sorting and filtering the buyers table server-side.** Session 3 adds search
  and filters. At 80 buyers doing it in the page is fine; past a few thousand
  it should move into the SQL query.
- **Showing a multi-profile buyer's second profile in the buyers table.** The
  table currently shows a buyer's first active search profile. Buyers with two
  profiles (home plus investment) are visible properly on the buyer page. If
  agents find the table misleading, worth revisiting.
- **Combining suburbs across profiles in the table.** Same question as above —
  deliberately not done, because merging two different briefs into one cell
  reads as one confused brief rather than two clear ones.
- **`npm audit` advisory on esbuild** inside drizzle-kit's dependency tree.
  Dev-only, not reachable in our usage, and `--force` breaks drizzle-kit.
  Revisit when drizzle-kit updates its dependency.

---

## Questions for the founder

Nothing outstanding. Anything that comes up that the brief doesn't cover gets
added here and asked before it's built.
