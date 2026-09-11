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
  Related and now settled: a buyer can update their own criteria directly from
  the portal, and the engine may prompt them to. See the recommendation layer
  section.
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

## The recommendation layer (the "algorithm")

The founder wants matching to go beyond a strict filter: to sometimes suggest
something outside a buyer's stated comfort zone, and to learn what a buyer
actually responds to. **"I want it sort of all mixed. I want it to be
powerful."**

**Not Phase 1.** This is a layer on top of the matching engine, and the engine
has to be right first.

### The principle that has to survive

Powerful and explainable are **not opposites**. The brief's own diagnosis of
why CRM matching fails is that results are "a filtered list with no
explanation, so agents don't trust them". What destroys trust is an
*unexplained* suggestion, not an ambitious one.

So the rule for everything below: **every suggestion carries its plain-English
reason, the same as every ordinary match.** "8% over their stretch, but it has
the pool they wanted" is both powerful and defensible to a buyer. "We think
you'll like this" is not.

### Decided with the founder

- **Mixed into the main ranked list**, not hidden in a separate section — but
  appearing **less often** than true matches, and always **labelled** as
  outside the buyer's brief.
- **Suggestions never silently rewrite a buyer's brief.** The system prompts;
  a human decides. On the agency side the **agent** is prompted. On the buyer
  side the **buyer** can be prompted to update their own criteria. **The buyer
  always has control of their own brief.**
- **Default boundary: 10% outside the brief**, and configurable — "they can set
  a scale".

### How it would work

1. **Stretch suggestions — deterministic and explainable.** Rules-based:
   within 10% above their stretch, one bedroom short, or an adjacent suburb
   they didn't list. Each states exactly why it's outside. Buildable with no
   machine learning at all, and it delivers most of the value.
2. **Learning from behaviour.** The signal is already being collected —
   `match_feedback` records every shortlist and dismiss today, and in the buyer
   portal every swipe would be too. Over time a buyer's behaviour diverges from
   their stated brief.
3. **Surface the contradiction, don't act on it.** Rather than quietly moving a
   score: *"Fiona's brief says no pool, but she's inspected three places with
   pools. Update her brief?"* This directly solves the problem the brief opens
   with — "buyer criteria are entered once and never updated" — while keeping
   a human in the loop.

### Open details

- **Who sets the scale?** "They can set a scale" is ambiguous. Could be an
  agency-wide default, a per-buyer setting an agent adjusts, or — probably the
  most interesting — a buyer-controlled "how adventurous should we be" slider
  in the portal. Worth deciding before it's designed.
- **What does "less common" mean numerically?** One in five results? Capped at
  two per list? Only when there are too few true matches? Needs a number.
- **What does a suggestion's fit line say?** A property outside the brief still
  computes a score and a "Fits X of Y". Whether that reads as a failure or is
  presented differently is a design question.
- **Cold start.** Learning needs history. A brand new buyer has none, so the
  engine has to be useful on day one from the stated brief alone.

### Why Session 2 doesn't foreclose any of it

The matching engine returns a full per-criterion breakdown for every buyer,
including the near-misses and the reasons they missed. A stretch band, a
contradiction report, and a learned ranking can all be built on top **without
changing the engine**.

---

## Detailed property specification, and matching on the nitty-gritty

The founder wants matching to go much deeper than the 26 feature slugs in brief
section 7: **"900mm oven, wall oven, gas, etc etc. Nitty gritty that the owner
would know."**

Two ways to collect it:

- **A form sent to the vendor.** They know their own house better than the
  agent does, and they are motivated — they want it sold. Costs the agency
  nothing but the send.
- **A detailed property specification completed by the agent or admin.**

And critically: **buyers answer the same questions with the same options** when
setting up their criteria, with the buyer told to **select more than one option
wherever they'd be happy with more than one**.

**Not Phase 1.** Section 7's fixed slug list stands for now.

### The instinct is right

Shared vocabulary on both sides is exactly why section 7 exists — the same
words for the buyer and the property, so matching is reliable. This extends a
principle that's already in the brief rather than fighting it.

It also answers a real problem visible in the Session 2 output: nineteen buyers
match 18 Kerrisdale Court and twelve of them score above 92. **The engine can
rank them but it can't really separate them.** Nitty-gritty detail is exactly
what would break those ties.

### The finding that matters: today's model can't express "any of these"

This is the concrete blocker, and it is worth knowing before anything is
designed.

`must_haves` is an **AND** list — every slug in it has to be present. The
founder's model needs **OR within an attribute**: "a 600mm *or* a 900mm oven is
fine, but it must be gas."

Namespacing slugs (`oven_900mm`, `oven_600mm`) does **not** solve it. Putting
both in `must_haves` means "must have both ovens". Putting them in
`nice_to_haves` scores half marks for getting exactly what they asked for.

So this needs a different shape — roughly:

- `property_attributes` — one row per property per attribute, with its value
- `profile_attribute_preferences` — one row per profile per attribute, with the
  **set of values the buyer would accept**, and whether it's a must or a nice

That is a new table, not more slugs. It does not require changing anything in
Phase 1, but it does mean this can't be bolted onto `features text[]` later.

### The risk worth taking seriously

**More fields do not mean better matching if the fields are empty.** The engine
already treats missing property data as `unknown` and excludes it from the
score. Scale that up: if fifty attributes exist and most properties have five
filled in, most criteria go unknown, scores get noisier, and the matching gets
*worse* while looking more sophisticated.

There is also a tension with the brief's own diagnosis. It opens by saying
criteria are **too rigid** and that real briefs sound like "walk to school, no
main road, would stretch for a pool". A fifty-question form is more rigid, not
less. And a buyer signing up from a QR code at an open home will not answer
fifty questions.

### The strong version of this idea

1. **Detail as a tie-breaker, not a gate.** Keep the current criteria deciding
   who matches at all. Let the nitty-gritty separate the twelve buyers who all
   score 92+. That way empty data costs nothing — it just doesn't break a tie.
2. **Lead with the vendor form.** It is the best part of the idea: free, richer
   data from the person who actually knows, and a reason to talk to the vendor.
   Worth doing even if the buyer side stays simple.
3. **Progressive on the buyer side.** A rough brief in thirty seconds at the
   open home, then optional refinement later — in the portal, where a buyer
   who is genuinely invested will happily answer more. Never fifty questions
   up front.
4. **Let swiping fill it in.** The portal's yes/no data infers preferences
   without asking, which is the same signal the recommendation layer needs.
5. **Cross-check with REAXML.** Phase 2's feed already carries structured
   property attributes. Worth seeing what it gives for free before asking
   vendors to type it.

### A note on "detailed and complex"

Complexity is a cost, not a feature. The goal is an engine that **discriminates**
— that can tell near-identical buyers apart — and that still explains itself in
one plain line per criterion. Richer data serves that. More rules for their own
sake work against it, because every extra rule is another thing an agent has to
trust.

### The design, settled

The founder confirmed: **a lot** of attributes, an unanswered attribute must
**never** exclude a buyer, and — the core requirement — *"I'm happy with a house
that has either 900mm or 600mm, doesn't bother me. If their criteria is more
than one, it needs to show them either option."*

Weighting was delegated ("I don't know, solve this"). Four rules answer it.

#### 1. An attribute is ONE criterion, however many values the buyer accepts

The unit of matching is the **question**, not the answer. "Oven size" is one
criterion. A buyer who accepts 900mm **or** 600mm has one criterion satisfied
by either value:

```
Buyer  — oven size: [900mm, 600mm]     one criterion
Buyer  — cooktop:   [gas]              one criterion
House  — oven size: 600mm              satisfies the first
House  — cooktop:   induction          misses the second
```

Satisfied when the property's value is **in the accepted set**. So ticking more
options makes a criterion *easier to satisfy* and never dilutes or inflates the
score — which is exactly the behaviour the founder described. It also gives the
buyer a real reason to tick everything they'd accept, rather than guessing that
being picky helps them.

#### 2. Four levels per question, set by the buyer

| Level | Effect |
|---|---|
| Deal breaker | Hard exclude, as today |
| Must have | Joins the must-haves pool |
| Nice to have | Joins the nice-to-haves pool |
| **Don't care** (unanswered) | Never scored, never excludes — the default |

"Don't care" being the default is what keeps a long form survivable: a buyer can
answer three questions or forty and neither is penalised.

#### 3. Weighting: don't invent new points

Detailed answers flow into the **existing** must-haves (15) and nice-to-haves
(5) pools from brief section 8.2, split evenly as they already are. The
100-point structure is untouched.

This answers the question directly: **a 900mm oven can never outweigh the
suburb**, because location's 25 points are not up for grabs. Location and price
keep exactly the weight the brief gives them, no matter how detailed the
specification gets.

It also behaves sensibly as detail grows. A buyer with 30 must-haves where the
property matches 25 earns 12.5 of 15. A buyer with 2 must-haves where it
matches both earns the full 15 — correctly, because the property genuinely
suits the second buyer better.

#### 4. Unknown attributes leave the pool entirely

Where the property has no answer recorded for an attribute, that attribute drops
out of **both** the numerator and the denominator — the 15 points split only
across the must-haves the property can actually answer. This is the same rule
the engine already applies to a missing price guide, and it is what makes the
empty-data risk survivable: a sparsely filled property scores on what is known,
and is never marked down for silence.

#### The fit strip stays readable

The strip cannot have forty segments and still be glanceable on a phone, which
the brief requires. So the core criteria keep their own segments, and **all
detailed answers roll up into a single segment** — "Details: 25 of 30" —
that expands to the individual answers. One more segment, not thirty.

### The vendor form, settled

- **The vendor pre-sets the specification.** They know the house.
- **The vendor has one hour after submitting to change their answers.** After
  that the form locks to them.
- **The agent can overwrite any answer afterwards**, permanently. The agent has
  the final say.
- **Access is a unique link per property**, sent to the vendor. No login.

#### The link is a credential — treat it as one

Anyone holding that URL can act as the vendor for that property, so it needs:

- **Scoping to exactly one property.** Never a vendor account, never a list.
- **An expiry**, and a new link issued rather than the old one revived.
- **Single purpose.** The form and nothing else.
- **No buyer data on it, ever.** This is the one that matters most. The vendor
  is not entitled to the agency's buyer pool, and the whole product promise to
  the agency is that their buyers are theirs. A vendor form that leaks match
  counts, buyer names or "14 buyers are interested" would be a serious breach
  of that promise — and, being a link, it can be forwarded to anyone.

#### Keep both answers, don't overwrite in place

Worth storing the vendor's submitted value **and** the agent's override
separately, rather than the agent's edit destroying what the vendor said.

- It answers the disagreement question without a rule: the agent's value is
  what matching uses, and the vendor's is still visible beside it.
- It gives the agent a reason to look — "the vendor says ducted heating, the
  agent says split system" is worth a phone call.
- Under the underquoting rules above, a record of who claimed what about a
  property is worth having rather than losing.

### Still open

- **Which attributes, exactly.** "A lot" needs to become a list before this can
  be built, and every one of them needs a fixed set of options on both sides —
  the same discipline section 7 applies to feature slugs today. This is the
  real prerequisite, and it is a product job rather than a technical one.
- **What stops it becoming a data-entry job** the agency ends up doing anyway
  when vendors don't fill it in.

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
