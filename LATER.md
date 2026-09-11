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
  The founder has since described this in far more detail — see "The buyer
  portal, as described by the founder" below.

---

## The buyer portal, as described by the founder

Captured verbatim in substance so nothing is lost. **Not being built.** This is
materially bigger than the one-line Phase 6 in the brief and should get its own
brief before any of it is designed.

### The idea

A consumer-facing app for buyers, deliberately **"designed to be deleted"** —
the buyer's success condition is buying a house and removing the app. Framed as
"find your dream home" rather than as a CRM.

- **Hinge-style swiping.** Swipe yes or no on matched listings. Every swipe
  feeds straight back to the agency dashboard, which is how the agency's buyer
  pool stays accurate without the agent chasing anyone.
- **Match score.** When a buyer matches a property they see a match score.
  The founder calls this "the heart of the buyer" experience — the buyer-side
  equivalent of the fit strip.
- **A saved bank of listings.** Yes-swipes go into a bank the buyer can look
  back through and enquire from.
- **Open home calendar.** Buyers see open home times and can add them to their
  own phone calendar.
- **Multi-agency, buyer-controlled.** A buyer who signs up with several
  agencies sees all of those agencies' listings. **Agencies can never see or
  share each other's buyers.** The buyer opts in and out per agency.
- **"I bought" closes the loop.** The buyer tells the app they've bought, which
  pings every connected agency to mark them purchased and close them out. This
  is the moment the buyer deletes the app.
- **QR sign-up at open homes.** The agent displays a QR code at the open home
  and buyers join from there. This extends the Phase 3 QR check-in rather than
  replacing it.

### Why it matters commercially

- **For agencies:** a genuinely accurate buyer pool, kept accurate by buyers
  themselves, with buyers who actually engage.
- **For buyers:** one place to track a house hunt across multiple agencies,
  including the off-market and pre-market stock they can't see on the portals.

### How Phase 1 already supports it

- `buyers.buyer_account_id` is the seam. The intended shape is that a **buyer
  account is the person**, and each row in `buyers` is that person's
  relationship with **one agency**. One person signing up with three agencies
  is three `buyers` rows sharing one `buyer_account_id`. That gives the
  multi-agency view for the buyer while keeping agencies fully walled off from
  each other, which is exactly the requirement. Worth confirming, but no schema
  change is needed for it.
- The matching engine (Session 2) is a pure function with no database access,
  so the same engine can serve the agent's fit strip and the buyer's match
  score. No duplicate scoring logic.
- `buyers.status` already has `purchased`, so "I bought" sets an existing
  status rather than needing a new one.

### What it would need that doesn't exist yet

None of these are Phase 1 work. Listed so they aren't a surprise later.

- **Open home times.** Nothing in the schema stores them. Needs a new table
  (property, start time, end time) before a calendar is possible.
- **Who gave the feedback.** See the open question below — this is the one
  item that could affect Phase 1.
- **A buyer accounts table**, with per-agency opt in and out, and its own
  consent record separate from the agency-held consent in `buyers`.
- **Enquiries from the saved bank** — a buyer-initiated enquiry is not the same
  thing as `match_feedback` and probably wants its own record.

### Product questions to settle before designing it

- **Buyer-facing reasons and the price guide — answered.** The agency decides
  whether to publish a price; where one exists, buyers see it. That means
  buyers see `price_display`, while `price_guide_min` / `price_guide_max` stay
  internal. Agent-facing reasons like "$40,000 over budget, within their
  stretch" still reveal the internal guide exactly, so **buyer-facing reasons
  need their own wording** — phrased against the advertised price, or against
  the buyer's own budget, never against the internal guide. See the pricing
  disclosure section above.
- **Does a swipe change the buyer's agency-side status?** A no-swipe is
  feedback on one property; it shouldn't move someone out of the pipeline.
- **What does the agent see when a buyer goes quiet in the app?** Engagement is
  the selling point, so silence is probably a signal worth surfacing.
- **Consent.** Phase 4 consent is agency-held for email and SMS. Portal consent
  is buyer-held and per agency. These are different records and shouldn't be
  conflated.

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

## Pricing disclosure and the Statement of Information

The founder's position: **it's up to the agency whether to add a price, and
buyers can see it if a price is available.** They also flagged that a Statement
of Information is mandatory in Victoria and coming to NSW.

Checked rather than written from memory, because a wrong compliance note is
worse than no note. **This is not legal advice.** Verify with the agency's own
legal adviser, the REIV or NSW Fair Trading before relying on any of it.

### Victoria

A Statement of Information is mandatory for residential sales. It must carry:

- an **indicative selling price** — a single figure, or a range no wider than
  10% of the lower figure
- **three comparable sales** with address, price and date. Metro: sold within
  the last 6 months and within 2km. Regional: within 18 months and 5km
- the **suburb median price**, covering a period of 3 to 12 months and no more
  than 6 months old
- if three comparable sales don't exist, a statement saying so

The indicative price must not be below the agent's own estimate, the vendor's
asking price, or any written offer already rejected on price.

### NSW

Further along than "soon". The Property and Stock Agents Amendment
(Underquoting and Other Agent Conduct) Act 2026 has passed. The first tranche
commenced **29 June 2026**, with the remainder expected late 2026. Residential
sale advertising must carry a selling price or price range (sale signs and
prescribed exempt classes aside), and agents must produce a Statement of
Information showing how the price was arrived at. Penalties rise from $22,000
to $110,000 or three times the agent's commission, whichever is higher.

### What this means for us

- **The schema already separates the two numbers correctly.** `price_display`
  is the advertised figure a buyer sees; `price_guide_min` / `price_guide_max`
  are internal and used only for matching. The brief's "buyers never see this"
  applies to the internal guide, not the advertised price — which is exactly
  what the founder's answer confirms. No change needed.
- **Worth the founder taking advice on:** an internal price guide sitting well
  below the advertised indicative price is precisely the record an underquoting
  investigation would ask for. Agents legitimately hold internal estimates, but
  storing them in a system creates a discoverable trail across every listing.
  That is a business risk to get advice on, not a technical problem to fix.
- **Nothing stores Statement of Information data today.** A real SOI needs the
  three comparable sales and the suburb median, which no table holds. That is
  Phase 2 work at the earliest — REAXML feeds carry some of it.
- **Phase 6 impact:** if the buyer portal shows listings with prices, that is
  advertising, and the disclosure rules attach to it.

---

## Questions for the founder

### Open: can a buyer and an agent disagree about the same property?

**Why it's being asked now:** the brief requires the Phase 1 schema to support
Phases 2–6 without a rebuild, and the swiping portal is the one part of the
founder's vision that presses on a Phase 1 table.

Today `match_feedback` holds **one row per buyer per property**, recorded by an
agent. Once buyers swipe for themselves, two people are giving an opinion on
the same pairing, and the current design can only hold one of them.

The concrete case: an agent shortlists Nadia for 18 Kerrisdale Court because
she's perfect on paper, and Nadia swipes no because she's seen the street.
Right now one of those overwrites the other.

Three ways it could go:

1. **One shared verdict.** The most recent opinion wins, whoever gave it, and
   we just record who said it last. Simplest, and arguably right — a no from
   the buyer is the answer, regardless of what the agent thought.
2. **Two separate verdicts.** Agent and buyer opinions are kept apart, and the
   agent can see "I shortlisted them, they passed". Richer, and that gap is
   genuinely useful sales information.
3. **Buyer always wins, silently.** A buyer's no removes the pairing and the
   agent never sees they disagreed.

**Not blocking anything yet.** Session 2 (the matching engine) is a pure
function that doesn't touch this table at all. It first matters in **Session 4**,
which builds shortlist and dismiss. Deciding any time before then costs
nothing; deciding after Session 4 means reworking it.

### Also worth confirming, not urgent

- That a **buyer account is the person** and each `buyers` row is that person's
  relationship with one agency, so agencies stay walled off from each other.
  This is how `buyer_account_id` was designed; confirming it now means it
  doesn't need revisiting.
