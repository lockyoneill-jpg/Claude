@AGENTS.md

# Buyer Hub

Buyer management for Australian residential sales agencies. It sits alongside
whatever CRM the agency already runs: the CRM keeps vendors, listings and trust
accounting; buyers live here.

The product is two things: a buyer database that stays accurate with minimal
agent effort, and matching that ranks buyers against a property and **explains
every result in plain English**.

`BRIEF.md` is the source of truth. This file records decisions made while
building, so they don't have to be rediscovered.

---

## Working rules

- **The founder is non-technical.** Explain in plain English. End each session
  with how to run the app and what to click to check it works.
- **Show a short plan before coding each session, and wait for approval.**
- **If the brief doesn't cover a product decision, stop and ask.** Never guess.
- **Never add scope.** Ideas outside Phase 1 go in `LATER.md`.
- **Ask before adding any library** outside the locked stack below.
- Commit after each working step.
- At the end of every session: typecheck passes, tests pass, no console
  errors, everything committed.

---

## Phase 1 only

Building: buyers, properties, matching with reasons, status pipeline, AI brief
fill-in, seeded demo data, **no login**.

Explicitly **not** building: logins or multiple agencies in the UI, REAXML
import, email or SMS intake, QR check-in, sending anything, billing, CRM
integrations, a buyer portal, a native mobile app.

The schema must support Phases 2–6 without a rebuild. Fields that exist purely
for later phases are marked in `db/schema.ts`.

---

## Locked stack

| Purpose | Choice |
|---|---|
| App | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind v4. shadcn/ui allowed for primitives only, restyled to our tokens — the default shadcn look is not acceptable |
| Database | Supabase Postgres, Sydney (ap-southeast-2) |
| ORM | Drizzle ORM + drizzle-kit |
| Validation | Zod |
| Tests | Vitest (required for the matching engine) |
| AI | Anthropic TypeScript SDK, model from `ANTHROPIC_MODEL`, default `claude-sonnet-5` |
| Drag and drop | dnd-kit (Session 5) |
| Hosting | Local in Phase 1. Vercel later |

---

## Decisions made while building

These weren't spelled out in the brief. None of them are product decisions —
each one is the implementation choice that keeps us inside the locked stack.

- **No `tsx` or `dotenv`.** Node 22 runs TypeScript natively and has a built-in
  `--env-file` flag, so the seed script and drizzle-kit get their environment
  without adding a library outside section 3.
- **`"type": "module"`** in `package.json`, so Node doesn't re-parse the seed
  script and print a warning at the founder.
- **Relative `.ts` imports inside `db/`** (e.g. `../lib/domain.ts`) rather than
  the `@/` alias, because plain Node can't resolve TypeScript path aliases.
  App code under `app/` and `components/` still uses `@/`.
- **`@types/node` pinned to v22** to match the Node we actually run. The Next
  scaffold shipped v20, which Vitest 5 rejects.
- **One light palette, no dark mode.** The brief specifies a single palette for
  a tool that must be readable in a car park at midday.
- **`prepare: false`** on the Postgres client, so the same connection string
  works against Supabase's pooled and direct ports.
- **Phone numbers** come only from ACMA's fictional ranges — see below.
- Known advisory: `esbuild` inside drizzle-kit's dependency tree has a moderate
  dev-server advisory. Not reachable in our usage (we never run esbuild's dev
  server) and `npm audit fix --force` would break drizzle-kit. Left alone.

---

## Data model notes

- UUID primary keys, `created_at` / `updated_at` on **every** table.
- Every table except `agencies` has `agency_id`, and **every query filters by
  it** — even though Phase 1 has one agency. This is what makes Phase 5 a
  change of scope rather than a rebuild. `lib/agency.ts` is the single place
  that decides "which agency", so it's the only thing that changes when logins
  arrive.
- `lib/domain.ts` and `lib/features.ts` are the single sources of truth for
  vocabulary. The database enums are built from those arrays, so the database
  and the UI cannot drift.
- **Feature slugs are a fixed list.** Anything a buyer wants that isn't on the
  list goes in `brief_text`, never a new slug. Adding a slug is a product
  decision.
- Nullable criteria are meaningful: `null` means *the buyer didn't set this*,
  which is scored differently from *the property doesn't have it*.

### Buyer status

Pipeline, in order: New enquiry → Looking → Inspecting → Offer made → Under
contract → Purchased. Off-pipeline: Paused, Bought elsewhere, Not proceeding.

Readiness (finance, needs to sell, timeframe, pre-approval expiry) is separate
from status and shown as its own indicators.

**Check in flag:** last contacted more than 60 days ago, or never contacted and
created more than 14 days ago. Only active pipeline statuses qualify. Stale
buyers are **flagged, never excluded from matching**.

---

## Design

Tokens live in `app/globals.css` as Tailwind v4 `@theme` variables.

| Token | Hex | Use |
|---|---|---|
| Plan paper | `#F5F7F4` | App background |
| Surface | `#FFFFFF` | Panels, tables |
| Ink | `#1C2B33` | Primary text |
| Muted ink | `#5B6A70` | Secondary text |
| Rule | `#D8DED9` | Borders, dividers |
| Gum | `#2F6B57` | Primary actions, "met" |
| Wattle | `#D9A21B` | "Partial" and stretch — **fill only**, text on it stays Ink |
| Brick | `#A8432F` | "Missed", deal breakers, errors |

- **Colour never carries meaning on its own.** Always pair with an icon or a
  word, so it works for colour-blind users.
- Source Sans 3 throughout. Tabular figures for all numbers (set once on
  `body`). Scale: 14px table, 16px body, 20px section headings, 28px titles.
- Left nav rail on desktop, bottom bar on mobile. Real tables, not card grids;
  they become stacked rows on mobile. Content left-aligned.
- The **fit strip** is the one memorable element. Everything else stays quiet.
- Avoid: all-caps and tracked-out eyebrow labels, identical shadowed cards,
  gradients, emoji, arrows appended to button text, meta strings joined with
  middle dots.

### Copy

Australian English, sentence case, agent vocabulary (enquiry, open home,
off-market, price guide, pre-approval). Buttons say exactly what happens
("Save buyer", "Log contact", "Dismiss match"). Empty states say what to do
next. **Errors say what went wrong and how to fix it, and never apologise.**
AI tone is neutral, with no cheerful personality.

Quality floor: responsive to 375px, visible keyboard focus, WCAG AA contrast,
reduced motion respected.

---

## Seed data

One agency (Barwon Coast Property, VIC), 6 agents, 80 buyers, 20 properties.

**Phone numbers must only come from the ranges the ACMA reserves for fictional
use.** Never invent a real-looking number.

- Mobiles: only ~30 **specific** numbers in `0491 57x xxx` are reserved. The
  surrounding block is **not**. `db/seed-data.ts` lists them verbatim; do not
  extend that list by guesswork.
- Victorian landlines: `(03) 5550 xxxx` and `(03) 7010 xxxx` are reserved in
  full, so most contacts use one.
- Emails all use `@example.com`. Street names are invented; suburbs are real.

The off-market listing at **18 Kerrisdale Court, Highton** is the demo's hero.
It matches 19 buyers with a real spread of scores (dead-centre budgets,
overlapping, stretch-only, and buyers one bedroom short). Don't reshape the
Highton-corridor buyers without re-checking that spread.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run db:push` | Create or update the tables in Supabase |
| `npm run db:seed` | Load the demo data (clears first, safe to re-run) |
| `npm run setup` | `db:push` then `db:seed` |
| `npm run db:studio` | Browse the database in a web UI |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |

---

## Session progress

- [x] **Session 1** — Setup and data. Next.js + Tailwind + Drizzle, Supabase
      connection with a `.env` walkthrough, full schema, seed script, app shell
      with the four nav items, plain Buyers table.
- [ ] **Session 2** — Matching engine in `/lib/matching`, built exactly to
      section 8, with Vitest tests for every rule.
- [ ] **Session 3** — Buyers: search and filters, buyer page, add/edit,
      notes and activity timeline, Log contact.
- [ ] **Session 4** — Properties: table, property page with ranked matched
      buyers and fit strips, add/edit, shortlist and dismiss, Copy contacts.
- [ ] **Session 5** — Pipeline board (dnd-kit) and the Today screen.
- [ ] **Session 6** — Fill in from brief (Zod-validated, slugs only), design
      polish pass, written 5-minute demo script.
