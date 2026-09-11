# Buyer Hub: Project Brief (working name)

## 1. What this is

A buyer management platform for Australian residential sales agencies. It works alongside whatever CRM the agency already uses (Vault, AgentBox, Rex, Box+Dice or anything else). The CRM keeps vendors, listings and trust accounting. Buyers are managed here.

**The problem.** Most CRMs already have basic buyer matching, but in practice it fails:

- Buyer criteria are entered once and never updated. People who bought months ago still get alerts.
- Criteria are too rigid (beds, price, suburb). Real buyer briefs sound like "walk to school, no main road, would stretch for a pool."
- Buyer status and readiness (pre-approval, needing to sell first, timeframe) are rarely recorded.
- Match results are a filtered list with no explanation, so agents don't trust them.

**The product.** A buyer database that stays accurate with minimal agent effort, and matching that ranks buyers against a property and explains every result in plain English.

**Who pays.** Agency principals. The promise is more matched buyers per listing, and faster on-market and off-market sales.

**Who uses it daily.** Sales agents, on desktop and on their phones between opens.

---

## 2. Phases (build Phase 1 only)

| Phase | What | Status |
|---|---|---|
| 1 | Buyers, properties, matching with reasons, status pipeline, AI brief fill-in. Seeded demo data. No login. | **Build now** |
| 2 | REAXML listing import (manual file upload first, then FTP feed) | Later |
| 3 | Enquiry intake by forwarding address (agents forward portal enquiry emails to a unique address), plus open home QR check-in | Later |
| 4 | Matched email and SMS sends with consent and unsubscribe (Spam Act) | Later |
| 5 | Agency accounts, logins, permissions, billing | Later |
| 6 | Buyer portal: buyers update their own brief and status, see off-market and pre-market listings, and can opt in to cross-agency matching | Later |

Phase 1 must be a convincing click-through demo for agency principals. The schema must support phases 2–6 without a rebuild; section 5 marks the fields that exist for later phases.

---

## 3. Stack (locked)

- **App:** Next.js (App Router) and TypeScript
- **Styling:** Tailwind CSS. shadcn/ui is allowed for primitives only (dialogs, selects, popovers) and must be restyled to the design tokens in section 9. The default shadcn look is not acceptable.
- **Database:** Supabase Postgres, Sydney region (ap-southeast-2)
- **ORM and migrations:** Drizzle ORM and drizzle-kit
- **Validation:** Zod
- **Tests:** Vitest (required for the matching engine)
- **AI:** Anthropic TypeScript SDK. Read the model from the `ANTHROPIC_MODEL` env var, defaulting to `claude-sonnet-5`.
- **Drag and drop (pipeline board):** dnd-kit
- **Hosting:** runs locally in Phase 1. Vercel later.

Ask before adding any library not listed here.

---

## 4. Out of scope for Phase 1

Do not build any of these:

- Logins, auth, or multiple agencies in the UI. Use one seeded agency.
- REAXML import, email intake, QR check-in
- Sending email or SMS
- Billing
- CRM integrations
- A buyer-facing portal
- A native mobile app. The web app must be responsive instead.

---

## 5. Data model

Every table except `agencies` has `agency_id`. All queries filter by it, even though there is only one agency in Phase 1. Use UUID primary keys and `created_at` / `updated_at` on every table.

### agencies
- `name`
- `default_state` (e.g. VIC)

### agents
- `agency_id`, `name`, `email`, `phone`
- No login in Phase 1.

### buyers
- `agency_id`, `assigned_agent_id`
- `first_name`, `last_name`, `email`, `phone`, `partner_name` (nullable)
- `source`: portal_enquiry | open_home | referral | walk_in | database_import | other
- `status`: see section 6
- `status_changed_at`
- `finance`: unknown | not_started | pre_approved | cash
- `pre_approval_expires_on` (date, nullable)
- `needs_to_sell` (boolean, nullable meaning unknown)
- `timeframe`: now | within_3_months | within_6_months | just_looking | unknown
- `brief_text`: the buyer's brief in plain language, as the agent wrote it
- `last_contacted_at` (nullable)
- `archived_at` (nullable)
- **Consent (for Phase 4):** `email_consent`, `sms_consent` (booleans), `consent_source` (text), `consent_at` (timestamp)
- **Portal link (for Phase 6):** `buyer_account_id` (nullable, unused for now)

### search_profiles
A buyer can have more than one profile (for example "Family home" and "Investment"). The Phase 1 UI can default to one, but must not block adding more.

- `buyer_id`, `agency_id`, `name`, `active`
- `suburbs` (text[]), `also_consider_suburbs` (text[])
- `property_types` (text[]): house | unit | townhouse | land | acreage | other
- `price_min`, `price_max`, `stretch_max` (all nullable)
- `beds_min`, `baths_min`, `cars_min` (nullable)
- `land_min_sqm`, `land_max_sqm` (nullable)
- `must_haves`, `nice_to_haves`, `deal_breakers` (text[], using feature slugs only; see section 7)

### properties
- `agency_id`, `listing_agent_id`
- `address_line`, `suburb`, `state`, `postcode`
- `property_type`
- `listing_status`: off_market | pre_market | on_market | under_offer | sold | withdrawn
- `price_display`: the advertised price text, e.g. "Offers over $850,000"
- `price_guide_min`, `price_guide_max`: internal, used for matching (nullable)
- `beds`, `baths`, `cars`, `land_sqm`, `building_sqm` (nullable)
- `features` (text[], feature slugs)
- `description`, `image_urls` (text[])
- **For Phase 2:** `source` (manual | reaxml) and `external_id` (the listing's ID from the REAXML feed, nullable, unique per agency)

### match_feedback
- `agency_id`, `buyer_id`, `property_id`, `agent_id`
- `state`: shortlisted | dismissed | inspected | not_interested
- `reason` (text, nullable)
- Unique on (buyer_id, property_id).

### activities
- `agency_id`, `buyer_id`, `agent_id` (nullable), `property_id` (nullable)
- `type`: note | call | status_change | match_shortlisted | match_dismissed | inspection
- `body` (text), `created_at`
- Status changes and match feedback create activities automatically.

---

## 6. Buyer status pipeline

**Pipeline columns, in order:** New enquiry → Looking → Inspecting → Offer made → Under contract → Purchased

**Off-pipeline statuses:** Paused, Bought elsewhere, Not proceeding

**Readiness** is separate from status and is shown as its own indicators: finance, needs to sell, timeframe, and pre-approval expiry.

**Stale buyer ("Check in" flag):**
- `last_contacted_at` is more than 60 days ago, or
- `last_contacted_at` is null and the buyer was created more than 14 days ago.

Stale buyers are flagged, not excluded from matching. Only active pipeline statuses can be stale.

---

## 7. Feature vocabulary

Features must come from a fixed list of slugs so matching is reliable. Store the list in one config file with a display label for each.

- **Home layout:** pool, north_facing, study, home_office, second_living, ensuite, walk_in_robe, single_level, double_storey, granny_flat
- **Parking and outdoor:** garage, shed_workshop, side_access
- **Comfort and efficiency:** solar, ducted_heating_cooling
- **Condition:** renovated, needs_renovation
- **Yard:** established_garden, low_maintenance_yard
- **Location:** water_views, walk_to_beach, walk_to_school, walk_to_shops, walk_to_station, quiet_street, corner_block, main_road

`main_road` exists mainly so it can be used as a deal breaker. Anything a buyer wants that isn't on this list goes in `brief_text`, not in a new slug.

---

## 8. Matching engine (the core of the product)

Build this as a pure function in `/lib/matching`: property and buyer data in, ranked results out, with no database access inside. It must have Vitest unit tests covering every rule below.

### 8.1 Hard excludes (never shown)
A buyer profile is excluded from a property's matches if any of these are true:

- The buyer's status is Purchased, Bought elsewhere or Not proceeding, the buyer is archived, or the profile is inactive.
- The property is sold or withdrawn.
- The profile has property types set and the property's type isn't one of them.
- The property has any of the profile's deal-breaker features.
- The profile has suburbs set and the property's suburb is in neither `suburbs` nor `also_consider_suburbs`.
- The property's `price_guide_min` is above `stretch_max`, or above `price_max` when there is no stretch.
- The property has two or more fewer bedrooms than `beds_min`.
- There is `match_feedback` for this buyer and property with state dismissed or not_interested.

### 8.2 Scoring
- Only criteria the buyer actually set count. Score = points earned ÷ points possible for those criteria, scaled to 0–100.
- Unset criteria are neither earned nor possible.
- If the property is missing the data a criterion needs (e.g. no price guide), that criterion is **unknown**: excluded from the score and shown as unknown.

| Criterion | Possible | Earned |
|---|---|---|
| Location | 25 | In suburbs: 25. In also-consider: 15. |
| Price | 25 | Guide within min–max: 25. Guide overlaps range: 20. Within stretch: 10. |
| Bedrooms | 15 | Meets minimum: 15. One short: 5. |
| Bathrooms | 5 | Meets minimum: 5 |
| Car spaces | 5 | Meets minimum: 5 |
| Land size | 5 | Within range: 5 |
| Must-haves | 15 | Split evenly across the buyer's must-haves |
| Nice-to-haves | 5 | Split evenly across the buyer's nice-to-haves |

### 8.3 Reasons
Every result returns one reason per criterion the buyer set:

- `criterion`
- `result`: met | partial | missed | unknown
- `detail`: plain English, Australian spelling, whole-dollar amounts with commas. Examples:
  - "In Highton, one of their suburbs"
  - "$40,000 over budget, within their stretch"
  - "One bedroom short"
  - "No price guide on this property"

Also return `met_count` and `set_count`, used for the "Fits 7 of 9" line.

### 8.4 Ranking
Sort by fit score (highest first), then readiness, then `last_contacted_at` (most recent first).

Readiness order:
1. Cash or pre-approved (with an unexpired pre-approval)
2. Timeframe now
3. Within 3 months
4. Everything else

A buyer with several active profiles appears once, using their best-scoring profile.

### 8.5 Scale
Compute matches when a page is loaded. That is fine for Phase 1 (up to about 5,000 profiles). Leave a comment noting where caching would go later.

---

## 9. Screens

The left navigation has four items: **Today, Buyers, Pipeline, Properties.**

### Today
- Buyers to check in (stale), oldest first
- Pre-approvals expiring in the next 30 days
- Properties added in the last 7 days, each with its match count and top 3 buyers
- Pipeline counts by status

### Buyers
- A dense, sortable table: name, status, assigned agent, suburbs, budget, finance, last contacted, and the Check in flag
- Search, plus filters for status, agent, suburb, price range, finance and stale
- Clicking a row opens the buyer page.

### Buyer page
- **Header:** name, phone, email, a status selector, assigned agent, and a "Log contact" button that sets `last_contacted_at` and adds an activity
- **Left column:** readiness, brief text, search profile summary (editable), and the activity timeline with an add-note box
- **Right column:** properties that match this buyer, each with a fit strip (section 10), and shortlist and dismiss buttons

### Add / edit buyer
- A large text box for the plain-language brief, with a **Fill in from brief** button. It appears only when `ANTHROPIC_API_KEY` is set.
- Below it, the structured form (contact details, readiness, search profile).
- AI output only pre-fills the form. The agent reviews it and presses **Save buyer**. Nothing saves automatically.

### Pipeline
- A board with one column per pipeline status. Off-pipeline statuses sit in a collapsible tray.
- Dragging a card changes the buyer's status and logs an activity.
- Cards show name, budget, readiness and the Check in flag.

### Properties
- Table: address, status (off-market and pre-market clearly distinguished), price display, beds, baths, cars, and match count.

### Property page
- Property details on the left.
- Ranked matched buyers on the right: fit strip, readiness indicators, assigned agent, last contacted.
- Agents can select buyers:
  - **Copy contacts** copies names, phones and emails to the clipboard.
  - **Send to selected** is shown disabled, with the note "Sending isn't available yet."
- Dismiss and shortlist per buyer.

### Add / edit property
- A structured form using feature slugs as toggles.
- A price guide min and max, with helper text: "Used for matching only. Buyers never see this."

---

## 10. Design direction

**Subject:** a working tool for Australian sales agents. Calm, fast and trustworthy, readable in a car park at midday. The one memorable element is the **fit strip**; everything around it stays quiet.

### Colour tokens
| Name | Hex | Use |
|---|---|---|
| Plan paper | #F5F7F4 | App background (faint grey-green, like survey plan paper) |
| Surface | #FFFFFF | Panels, tables |
| Ink | #1C2B33 | Primary text |
| Muted ink | #5B6A70 | Secondary text |
| Rule | #D8DED9 | Borders, dividers |
| Gum | #2F6B57 | Primary actions, "met" |
| Wattle | #D9A21B | "Partial" and stretch. Use as a fill only; text on it stays Ink. |
| Brick | #A8432F | "Missed", deal breakers, errors |

Colour never carries meaning on its own. Always pair it with an icon or text so it works for colour-blind users.

### Type
- **Source Sans 3** for everything.
- Use tabular figures for all numbers (prices, counts, scores) so columns line up.
- Clear scale: 14px table text, 16px body, 20px section headings, 28px page titles.

### Layout
- Left nav rail on desktop, bottom bar on mobile.
- List screens are real tables, not card grids. On mobile they become stacked rows.
- Detail pages use two columns on desktop and one on mobile, with matches directly after the header.
- Content is left-aligned.

### The fit strip
- A horizontal row of equal segments, one per criterion the buyer set:
  - **Met:** solid Gum
  - **Partial:** Wattle
  - **Missed:** Brick outline
  - **Unknown:** dashed Rule
- The score sits to the left in tabular figures, with "Fits 7 of 9" beside it.
- Tap or click to expand the plain-English reasons list underneath.
- It must be clear at a glance on a phone.

### Avoid
- All-caps labels and tracked-out eyebrow labels
- Identical shadowed cards everywhere
- Gradients, emoji, and arrows appended to button text
- Meta strings joined with middle dots

### Copy rules
- Australian English, sentence case, and agent vocabulary (enquiry, open home, off-market, price guide, pre-approval).
- Buttons say exactly what happens: "Save buyer", "Log contact", "Dismiss match".
- Empty states tell the agent what to do next, e.g. "No matches yet. Widen the price or suburbs on this buyer's profile."
- Errors say what went wrong and how to fix it. They never apologise.
- The AI tone is neutral, with no cheerful personality.

Quality floor: responsive down to 375px, visible keyboard focus, WCAG AA contrast, and reduced motion respected.

---

## 11. Phase 1 session plan

Each session ends with something the founder can run and click through.

### Session 1: Setup and data
- Next.js project, Tailwind, Drizzle, Supabase connection with a step-by-step `.env` walkthrough
- Full schema from section 5, plus a seed script (see section 12)
- Basic app shell with the four nav items and a plain Buyers table showing seeded data

**Done when:** the app runs locally and shows the seeded buyers.

### Session 2: Matching engine
- `/lib/matching` built exactly to section 8, with Vitest tests for every rule

**Done when:** all tests pass. Show the founder three example results with reasons, printed in plain English.

### Session 3: Buyers
- Buyers table with search and filters, buyer page, add/edit buyer (manual form), notes and activity timeline, Log contact

### Session 4: Properties
- Properties table, property page with ranked matched buyers and fit strips, add/edit property, shortlist and dismiss, Copy contacts

### Session 5: Pipeline and Today
- Drag-and-drop pipeline board and the Today screen

### Session 6: AI and polish
- Fill in from brief, using Zod-validated JSON output limited to the feature slugs, with the default state taken from the agency
- Design polish pass against section 10
- A written 5-minute demo script (section 13)

**At the end of every session:** typecheck passes, tests pass, no console errors, and everything is committed to git.

---

## 12. Seed data

- **Agency:** one fictional agency, "Barwon Coast Property", default state VIC.
- **Agents:** 6 fictional agents.
- **Suburbs:** real suburbs in the Geelong region, such as Armstrong Creek, Highton, Belmont, Newtown, Geelong West, Grovedale, Waurn Ponds, Lara, Leopold, Drysdale, Ocean Grove and Torquay.
- **Contact details:** invented street names, `@example.com` emails, and ACMA's phone numbers reserved for fictional use. Look up the current list; never invent real-looking numbers.

**80 buyers** with realistic variety:
- Messy, human-sounding briefs
- A spread across all statuses
- Mixed finance and readiness, including some pre-approvals expiring soon
- About 15 stale buyers
- A few with two search profiles (for example home plus investment)
- A few with deal breakers

**20 properties:**
- 3 off-market, 3 pre-market, the rest on-market, under offer or sold
- Some without a price guide, so the "unknown" state is visible
- Prices realistic for the region

**Shape the data so the demo lands.** At least one off-market property should match 10 or more buyers with a good spread of scores.

---

## 13. Demo script (for Session 6 to write up properly)

1. Open Today. Show stale buyers and expiring pre-approvals.
2. Add an off-market property. Show the ranked matched buyers appearing immediately, each with a fit strip and reasons.
3. Expand a match to show the reasons in plain English. Dismiss one and watch it disappear.
4. Add a buyer by pasting a messy brief, pressing Fill in from brief, and reviewing the form. Show which properties they match.
5. Drag a buyer to Offer made on the Pipeline and show the activity it logged.

---

## 14. Working rules for Claude Code

- The founder is non-technical. Explain in plain English, and end each session with how to run the app and what to click to check it works.
- Show a short plan before coding each session and wait for approval.
- If the brief doesn't cover a product decision, stop and ask. Never guess.
- Never add scope. Log ideas in `LATER.md`.
- Keep `CLAUDE.md` updated with decisions made along the way.
- Ask before adding any library outside section 3.
