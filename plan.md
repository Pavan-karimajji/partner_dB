# Stage 1 — Partner Detail Restructure (UI Skeleton)

Status: DRAFT — for review, not yet implemented.
Branch: `product-level-eval`

## Goal

Replace the current `Technical Evaluation / Perception & Function / Products &
Portfolio / Notes` sub-tabs on the Partner Detail page with a product-centric
structure, proven first with a minimal skeleton (2 question categories, 1
sample question each) before any of the existing ~210 questions are migrated
or re-tagged.

Existing `data/partners.json` content (techScores, perceptionResponses, etc.)
is explicitly out of scope this stage — nothing there is read for design
decisions, and nothing there will be deleted. New fields are additive.

## Sub-tab structure

Partner Detail page sub-tabs become:

```
General | Product 1 | Product 2 | [+ Add Product] | Notes
```

- **General** — one set of answers per partner. Replaces the role previously
  split across "Technical Evaluation" + "Perception & Function".
- **Product N** — one tab per product already defined in
  `partner.products[]`. Keeps the existing sensor checkboxes
  (radar/camera/fusion/SoC), function checkboxes (AEB/ACC/etc.), and sensor
  notes that live there today — those are unaffected — and gains a new
  "Product Questions" block underneath.
- **Notes** — unchanged.

`Add Product` already exists today (implied by `products[]` + `newProduct()`
in app.js) — Stage 1 keeps that mechanism, just adds a tab per product
instead of listing all products in one flat page.

## Status taxonomy (replaces 1–5 numeric score for these new questions)

Jira-style status per question, plus a verification flag:

| Tag | Meaning |
|---|---|
| `NA` | Not applicable to this partner/product |
| `Yet to Start` | Partner hasn't begun this yet |
| `In Progress` | Partially done / underway |
| `Accomplished` | Partner claims this is complete |
| `Verified` | L&T has seen evidence (test report, demo, doc) confirming it |

Rationale: separates *self-reported* completion (`Accomplished`) from
*confirmed* completion (`Verified`), which matters for supplier
due-diligence. This taxonomy is independent of the old 1–5 `scoreLabels`
system — it does not touch `verdictThresholds` or the radar/comparison
charts, which still run off the old `techScores` data untouched in Stage 1.

## Schema additions (`schema.json`)

Net-new keys, nothing removed yet:

```json
"answerStatuses": [
  { "key": "na",           "label": "NA" },
  { "key": "yet_to_start",  "label": "Yet to Start" },
  { "key": "in_progress",   "label": "In Progress" },
  { "key": "accomplished",  "label": "Accomplished" },
  { "key": "verified",      "label": "Verified" }
],
"questionCategories": [
  { "id": "general", "label": "General" },
  { "id": "product",  "label": "Product" }
],
"detailQuestions": [
  { "id": 1, "category": "general", "text": "Sample general question — answered once per partner." },
  { "id": 2, "category": "product",  "text": "Sample product question — answered once per product." }
]
```

`detailQuestions` is intentionally tiny. Expanding it (and later adding a
`sensorScope` field to filter which products show a given product-category
question) is a Stage 2 concern — the skeleton just needs to prove the
category → tab routing works.

## Data additions (`data/partners.json`)

Additive only, parallel to existing fields:

```json
// on the partner object
"generalAnswers": [
  { "qId": 1, "status": "in_progress", "remarks": "" }
]

// on each entry in partner.products[]
"answers": [
  { "qId": 2, "status": "na", "remarks": "" }
]
```

Old `techScores` / `perceptionResponses` fields stay in the file, untouched
and unused by the new UI.

## UI layout per tab

**General tab**
- Existing partner-level fields (business model, decision info, etc.) stay
  exactly where they are today.
- New block: "General Questions" — table of `text | status dropdown (5
  options) | remarks textarea (auto-grow)`, one row per `general`-category
  question, bound to `partner.generalAnswers`.

**Product N tab**
- Existing sensor/function checkboxes + sensor notes stay exactly where they
  are today.
- New block: "Product Questions" — same table layout, bound to
  `product.answers`, one row per `product`-category question.

**Notes tab** — unchanged.

## Code touch points (for implementation — DONE, see Stage 2 sections below for everything built on top of this skeleton)

- `static/index.html`: rename/restructure the sub-tab button row (remove
  `technical`/`perception` buttons, generate `Product N` buttons dynamically
  per partner instead of a static `products` button).
- `static/app.js`:
  - `renderDetail()` — replace the technical/perception tab markup blocks
    with a `detail-tab-general` block and one `detail-tab-product-<id>` block
    per product; tab-switch logic becomes data-driven over
    `partner.products` instead of a fixed list.
  - New helpers: `ensureGeneralAnswer(qId)`, `ensureProductAnswer(productId,
    qId)` (mirrors existing `ensureSectionScore`/`ensureQuestion` pattern).
  - `handleDetailChange()` — new `dataset.generalStatus` /
    `dataset.generalRemarks` / `dataset.productStatus` /
    `dataset.productRemarks` branches, replacing (not yet deleting) the old
    `qScore`/`qRemarks`/`pResponse`/`pJudgement`/`pRemark` branches.
- `static/style.css`: reuse existing `q-row`/`q-table-header`/`q-remarks-input`
  classes for the new question tables; add 5 small status-badge color
  classes (e.g. `status-na`, `status-yet-to-start`, `status-in-progress`,
  `status-accomplished`, `status-verified`) for the print/PDF view.

## Explicitly out of scope for Stage 1

- Migrating or re-tagging any of the existing 139 tech / ~70 perception
  questions into `detailQuestions`.
- Sensor-modality scoping (camera/radar/fusion-specific visibility) for
  product questions.
- Any change to weighted scoring, radar chart, comparison matrix, or verdict
  thresholds — those keep reading the old `techScores` structure as-is.
- Deleting old `techScores`/`perceptionResponses` data or UI plumbing.

## Resolved decisions

1. **Grouping** — no accordion/section grouping for Stage 1. Each question
   table sits under a single plain heading (e.g. "General Questions" /
   "Product Questions"). Grouping by sub-category can be introduced once
   there are enough real questions to need it.
2. **Verification evidence** — a remarks field is sufficient for `Verified`
   in Stage 1; no separate evidence/attachment field.
3. **Add Product** — keep current behavior unchanged (button creates a new
   blank product, which immediately gets its own tab). No alternative
   proposed — straightforward and already working.

## Status

DONE. Implemented and superseded by Stage 2 (real questions migrated in,
sample qIds 1–6 dropped — see Stage 2 "Implementation — DONE" below).

## Addendum — Patents tab (added after Stage 1 implementation, before Stage 2)

A fifth fixed sub-tab, `Patents`, sits between `[+ Add Product]` and `Notes`:

```
General | Product 1 | Product 2 | [+ Add Product] | Patents | Notes
```

Patents live at partner level (not nested in a product — a patent often
isn't tied to a single product instance), as an addable/removable list like
Products, but rendered inside one fixed tab rather than getting a tab per
patent.

**Per-patent fields:**
- `title`, `patentId` (application/patent number — relevant once NDA-shared
  real IDs exist), `status` (full lifecycle, see below), `grantedBy`
  (issuing authority, e.g. USPTO/IPO India), `jurisdiction` (free text),
  `notes`.
- `relevanceType` — one of `sensor` / `function` / `perception` / `hardware`
  / `custom`, plus either `relevanceKey` (reuses `productSensors`/
  `productFunctions` lists when type is sensor/function) or
  `relevanceLabel` (free text for perception/hardware/custom). Loosely tied
  — not a hard scope like product question sections — and may be left
  blank for company-level patents not tied to anything specific.

**Status taxonomy** (`schema.patentStatuses`): `Not Filed` → `Filed/Pending`
→ `Published` → `Granted` → `Rejected/Abandoned` → `Expired`.

No question/answer-status sections under Patents — it's metadata tracking,
not an evaluation checklist like General/Product tabs.

Implementation: `schema.json` (`patentStatuses`, `patentRelevanceTypes`),
`server.py` (`patents: []` on new-partner template), `data/partners.json`
(`patents: []` added to existing partners), `static/app.js`
(`findPatent`/`newPatent`/`patentCardHtml`/`patentsTabHtml`, add/remove
click handlers, `data-patent-field`/`data-patent-relevance-type` change
handlers).

---

# Stage 2 — Real Question Migration

Status: IN PROGRESS — tracking file built, open decisions pending review.
Branch: `product-level-eval`

## Goal

Replace the 6 sample `detailQuestions` from Stage 1 with the real ~217
questions currently sitting in three source spreadsheets under `docs/`,
correctly sorted into General vs. Product-scoped sections. Then redesign
the Comparison page (currently a placeholder) around the new status-tag
answers.

## Source material

- `docs/adas_vendor_technical_evaluation_internal.xlsx` — 139 items,
  4 sheets, L&T-internal phrasing + scoring criteria + remarks column.
  Continuously numbered 1–139 across its sheets.
- `docs/adas_vendor_technical_evaluation_supplier.xlsx` — same 139-item
  set minus 5 internal-only items (134 total), vendor-facing question
  phrasing, numbering restarts at 1 per sheet.
- `docs/adas_partner_perception_and_function_evaluation.xlsx` — 78 items,
  3 sheets, vendor-facing phrasing, numbering restarts at 1 per sheet.
  No internal/supplier split for this one.

Combined total: 217 items (139 + 78).

## Methodology (agreed with user)

1. Build one tracking markdown file listing every source question with a
   proposed target (General vs. Product, and scope if Product). Use
   checkboxes so items can be ticked off as we confirm placement together.
2. Where similar/duplicate questions exist across the source files,
   resolve into a single right place; ask the user when ambiguous rather
   than guessing.
3. End state: every item is mapped; redundant/duplicate items removed
   (not kept twice).
4. Known structural gap to close (as a **separate follow-up phase**, not
   in this same pass): radar/lidar/fusion subsystem questions and
   radar-typical functions (BSD, RCTA) have zero coverage in the source
   material and need to be authored from scratch.

## Work done so far

- Extracted full content of all 3 workbooks to `docs/_extract/*.txt`
  (scratch, not committed yet — ok to delete once migration is done).
- Built `docs/_extract/combined_tech.json` and `combined_perc.json` —
  canonical per-item records (ref, category, text, section,
  internal-only flag) reconstructed from the source sheets.
  - **Important correctness note**: the internal vs. supplier item
    alignment is NOT purely positional — items can be dropped or
    reordered mid-category. The current canonical data was verified by
    hand, item-by-item, against the actual spreadsheet content (not by
    Jaccard/word-overlap heuristics, which produced false positives).
    The 5 confirmed internal-only items (no vendor-facing phrasing
    exists) are internal numbers: **9** (Field failure rate/warranty
    data), **97/98/99** (GDPR privacy / data anonymization / driver
    consent), **106** (Fleet monitoring dashboard).
- Built `docs/_extract/build_migration_md.py` — generates
  `docs/stage2_question_migration.md` from the combined JSON + a
  category→target mapping table (`TECH_RULES` / `PERC_RULES` in that
  script). Re-run this script if the mapping rules change rather than
  hand-editing the generated `.md` for bulk changes.
- Produced **`docs/stage2_question_migration.md`** — the live tracking
  file. 217 items, each with a proposed `general`/`product` + scope,
  organized by source section. 37 items flagged `⚠️ NEEDS REVIEW` or
  `⚠️ DUPLICATE` (see "Open decisions" list at the top of that file).

## Open decisions — RESOLVED

1. **DMS modeling** → add `DMS` to `productFunctions`, parallel to
   AEB/ACC/etc. — matches how the source material itself groups it.
   The 3 DMS-related Perception sections become `function:DMS` scoped.
   *(Schema change not yet implemented — see Next steps.)*
2. **Duplicate: Compute/SoC/TOPS** → merged into one Product-common
   "Architecture & Platform" section. Dropped `PERC-S3#1` (literal
   duplicate of `TECH#17`); kept the complementary deeper Perception
   questions (TIDL, quantization, min-TOPS, camera min-spec).
3. **Duplicate: AUTOSAR support** → kept `TECH#22` (covers Classic +
   Adaptive), dropped `PERC-S3#10` (narrower subset).
4. **Duplicate: SIL/HIL/simulator** → kept `TECH#57-59` (more complete
   breakdown), dropped `PERC-S3#13`.
5. **Camera-only vs. generic split** → applied per item: `TECH#49`/`#52`/
   `#53` (IP rating, lens contamination, calibration drift) → Camera
   Subsystem; `TECH#48`/`#50`/`#51` (operating temp, EMC/EMI,
   vibration/shock) + all of Components → new Product-common section
   "HW Robustness & Components". `PERC-S3#11`/`#12` (ISP dependency,
   calibration tooling) also moved to Camera Subsystem despite sitting
   in the generic "Integration" category.
6. **Function-scoped safety items** ("Target ASIL per function", "Safe
   state definition per function") → kept in General as free text; no
   new scoping infrastructure built for just 2 items.
7. **Camera-scoped lifecycle item** → `TECH#109` ("Spare parts strategy
   (camera modules)") moved to Camera Subsystem.
8. **Limitations / India Readiness** → Product-common (wording is
   explicitly "your current stack", not company-wide).

All resolutions are baked into `docs/_extract/build_migration_md.py`
(`TECH_RULES`/`PERC_RULES`/`OVERRIDES`) and reflected in the regenerated
`docs/stage2_question_migration.md` — 217/217 items now have a confirmed
placement; 3 are marked `DROPPED (confirmed duplicate)` and pre-checked.

## Schema/data model change already agreed — DONE (see Implementation below)

- Add a **`partnerResponse`** field to the answer model (general and
  product answers), separate from the existing `remarks` field — mirrors
  the source sheets' `Vendor Response` vs. `L&T Remarks`/`L&T Judgement`
  split. `remarks` = L&T's internal note; `partnerResponse` = what the
  vendor actually said. Needs `answerRowHtml`/`ensureGeneralAnswer`/
  `ensureProductAnswer` in `app.js` updated, plus a new column in the
  question-table UI.

## Implementation — DONE

1. ~~Resolve the 8 open decisions above (with user).~~
2. ~~Add `DMS` to `schema.json`'s `productFunctions` list.~~
3. ~~Implement the `partnerResponse` field~~ — added to `app.js`
   (`ensureGeneralAnswer`/`ensureProductAnswer` default it to `''`,
   `answerRowHtml` renders it as a second textarea between Status and
   Remarks, `handleDetailChange` has a `data-ans-partner-response`
   branch, `sectionHasAnswerData` counts it for the data-loss guard) and
   `style.css` (`.ans-row` grid widened from 4 to 5 columns: # / Question
   / Status / Partner Response / L&T Remarks).
4. ~~Write the real questions into `schema.json`.~~ Generated
   programmatically via `docs/_extract/build_schema_sections.py` (reads
   `combined_tech.json`/`combined_perc.json`, applies a category→section
   map + the same per-ref `OVERRIDES` used in the tracking file, emits
   `detailSections`/`detailQuestions` directly into `schema.json`).
   Each question carries a `sourceRef` field (e.g. `"TECH#47"`,
   `"PERC-S2#12"`) back to the original spreadsheet item for audit
   traceability — not used by the UI, just for future verification.
5. ~~Decide what happens to old sample answers (qIds 1–6).~~ Dropped —
   `data/partners.json` `generalAnswers`/product `answers` filtered to
   `qId > 6` (both partners had none beyond the samples, so this was a
   no-op on real data, confirmed via `git diff` before saving).

**Final structure**: 28 sections (3 General, 25 Product — scoped where
noted), 214 questions (217 source items minus 3 confirmed duplicates).
Section breakdown by question count: Company Overview (19), Validation &
Test Infra (17), Functional Safety & Cybersecurity (26), Compute &
Hardware (15), Software Architecture (6), Pipeline & Runtime (5), Power
(2), Camera: Image Sensor & Optics (8), Camera: ISP (5), Camera:
Robustness & Calibration (6), HW Robustness & Components (6), Camera
Perception: Pipeline Architecture (2) / Object Detection (12) / Lane
Detection (7) / Depth & Freespace (5) / SLR-TSR (3) / Model Quality (4) /
Output Interface (4), AEB Function Detail (5), ACC Function Detail (2),
LDW/LKA Function Detail (1), DMS Function Detail (10), Production
Readiness & Lifecycle (12), Software Quality (8), HMI (5), Regional
Compliance (7), EMC & Environmental (7), Known Limitations & India
Readiness (5).

**Note on section granularity**: the open-decisions conversation only
resolved *where* each question group goes at a coarse level (e.g. "all
camera perception → Product, sensor:camera"). When actually writing the
sections I split "Camera Perception" and "Architecture & Platform" into
several smaller sections each (mirroring the source spreadsheets' own
2A/2B/2C.../2.1/2.2/2.3 sub-structure) rather than one mega-section per
bucket — this was my call, not separately re-confirmed with the user,
made because a single ~50-question table would have been unusable. Easy
to rebalance later since it's pure data, not code.

**Verified via Playwright** (`C:\tmp\pwtest\test-stage2.js`): General tab
shows the 3 General sections; Product 1 (radar+SoC, no camera) correctly
hides all Camera/Camera-Perception sections; Product 2 (camera, LDW)
correctly shows them and shows LDW/LKA Function Detail while hiding AEB
Function Detail (AEB not checked); status + partnerResponse + remarks
all persist correctly through save/reload. Zero console errors.

## Corrections after first Stage 2 review (done)

User feedback after reviewing the implementation:

1. **Question-table sections should collapse** — clicking a section
   heading (e.g. "Compute & Hardware") did nothing. Fixed: each
   `answerQuestionsTableHtml` card is now `.q-section-card` with a
   `data-section-toggle-header` on its `.card-header` and a chevron
   (`▾`) in the title. `handleDetailClick` toggles a `.collapsed` class
   on the card (checked first, before the other data-* targets, since
   the header isn't one of those). CSS: default open, `.collapsed
   .card-body { display:none }`, chevron rotates -90°. Print view always
   force-expands (`.q-section-card .card-body { display:block
   !important }`), matching the existing accordion print rule.
2. **Add major headings for sensors/functions with zero question
   coverage** — "just major headings are sufficient" (content can be
   authored later). Added 6 placeholder sections (0 questions each, so
   they render "No questions defined for this section yet."):
   `prod-radar-subsystem` (sensor:radar), `prod-fusion-subsystem`
   (sensor:fusion), `prod-func-lca`/`prod-func-bsd`/`prod-func-rcta`/
   `prod-func-mois` (function-scoped). SoC intentionally excluded — see
   the Stage 1 decision "no questions for SoC, they're standard/just
   inventory toggles." These show up automatically via the existing
   generic scope mechanism the moment the matching sensor/function is
   checked on a product — no other code change needed.

Both implemented in `docs/_extract/build_schema_sections.py`
(`SECTIONS`/`SECTION_ORDER`) + `app.js`/`style.css`, verified via
Playwright (`C:\tmp\pwtest\test-corrections.js`): all 4 new function
headings appear after toggling their function on; collapse/expand works
on header click and doesn't trigger on clicks inside the body; zero
console errors. New section/question totals: **34 sections, 214
questions** (6 sections still at 0 questions — the placeholders above).

## Follow-up phase — DONE: authored Radar/Fusion/LCA/BSD/RCTA/MOIS content

The 6 placeholder sections now have real, manually-authored questions
(no source spreadsheet covers these — drafted to mirror the phrasing
style of the migrated questions, reviewed and approved by the user
before being written in):

- **Radar Subsystem** (10 questions) — frequency band, LRR/MRR/SRR type
  & mounting, range/FoV, angular resolution, object classification,
  interference handling, weather performance, AEC-Q100/chipset,
  calibration, update rate/latency.
- **Fusion Subsystem** (8 questions) — fusion architecture level,
  sensor combinations supported, fusion algorithm, time sync, conflict
  resolution between sensors, degraded-sensor fallback, confidence
  propagation, track management.
- **LCA Function Detail** (5), **BSD Function Detail** (5), **RCTA
  Function Detail** (4) — sensors used, range/FoV, false alert rate,
  warning/response strategy, standard compliance (BSD), trailer
  handling (BSD), RCTB integration (RCTA).
- **MOIS Function Detail** (6) — defined per user clarification as
  detection of moving objects in the close-range blind zone
  around/beneath large vehicles (trucks/buses) that the driver cannot
  see directly due to seating height/sightlines — distinct from BSD
  (rear-side) and RCTA (rear-reversing). Covers sensors, minimum
  detectable object size, coverage zone, stationary-vs-moving alert
  behavior, target vehicle class, validation evidence.

`sourceRef` is `null` for all of these (vs. `"TECH#47"` etc. for
migrated questions) — marks them as originated in-app, not traced to a
spreadsheet item.

**New totals: 34 sections, 252 questions** (was 214 before this round).
Verified via Playwright (`C:\tmp\pwtest\test-new-questions.js`): each
section's question count matches exactly what was authored; full
save/reload round trip confirmed on a MOIS answer; zero console errors.

## Comparison page — DONE: section-completion heatmap

Replaced the placeholder with a **partner × section-group completion
heatmap**: rows = partners, columns = 10 broader groups (the 34
`detailSections` collapsed so the table stays readable), each cell shows
`% of applicable questions (status != 'na') that are accomplished or
verified`, color-coded red (<34%) / yellow (34-66%) / green (≥67%) /
gray (no applicable questions yet). Rightmost column = overall % across
all groups. Rows sort by overall % descending. Clicking a partner name
jumps to their Partner Detail page.

**Why a heatmap, not a single number**: the user was unsure what
"compare partners" should even mean now that there's no 1-5 score to
average. Recommended this because the Overview and Decision Log pages
already cover pipeline stage and final decisions — Comparison's unique
job is showing *where* each partner is strong/weak, which a flat
overall-% number can't do.

**Rollup rule for Product-category groups**: aggregated across *all* of
a partner's products that have that section relevant — relevant means
either currently scope-matching (`sectionScopeMatches`) or having
already-logged answer data (`sectionHasAnswerData`, the same "sticky"
rule the detail page itself uses) — so a partner with 2 products both
touching Camera Subsystem gets one combined number, and unchecking a
sensor after answering its questions doesn't make that progress
disappear from the comparison either.

**Group definitions** (`COMPARISON_GROUPS` in `app.js`, every section id
appears in exactly one group): Company Overview, Validation & Test,
Functional Safety & Cybersecurity (each 1:1 with their General section);
Architecture & Platform (compute/sw-arch/pipeline/power); Camera
Subsystem (sensor-optics/isp/robustness); Camera Perception (all 7
camperc-* sections); Radar & Fusion; ADAS Functions (all 8 function-
scoped sections); HW Robustness & Quality (hw-robustness + sw-quality);
Production & Compliance (production-lifecycle/hmi/compliance/emc-env/
limitations-india).

Implementation: `index.html` (Comparison page body replaced with a
`#comparison-body` container), `app.js` (`COMPARISON_GROUPS`,
`computeGroupCompletion`, `heatmapCellClass`/`heatmapCellHtml`,
`renderComparison` — fetches full partner data via the same
`Promise.all` pattern `renderDecisionsFull` already used, computes
client-side, no backend changes needed), `style.css`
(`.comparison-table`, `.hm-cell`/`.hm-empty`/`.hm-low`/`.hm-mid`/
`.hm-high`, sticky partner-name column for horizontal scroll).

Verified via Playwright (`C:\tmp\pwtest\test-comparison.js`): answered
all 19 Company Overview questions as Verified → cell shows exactly
100%; answered 13/26 Functional Safety questions as Accomplished → cell
shows exactly 50%; partner-name click navigates to Partner Detail; zero
console errors.

## Domains + per-question priority + hero tagging — DONE

User feedback: the old master-branch UX was visually more polished than
the current rebuild — noted, not yet acted on (separate from this
work). The concrete ask was a 2-axis metadata layer on top of the 34
sections / 252 questions, with UI deliberately deferred ("we'll decide
later"):

1. **6 management-facing domains** — coarser than the 34 sections, for
   rolling up to leadership without showing 34 categories. All 34
   sections map to exactly one domain (`schema.domains` +
   `detailSection.domain`):
   - Company Background (2 sections: Company Overview, Production
     Readiness & Lifecycle)
   - Perception Stack & Function Maturity (18: all 7 Camera Perception
     + all 8 Function Detail + Validation & Test + Software Quality +
     HMI & Driver Interaction)
   - Regulation & Compliance (3: Compliance, EMC & Env, Limitations &
     India Readiness)
   - Safety & Cyber Security (1: Functional Safety & Cybersecurity)
   - Hardware Capability (10: Compute/SW-Arch/Pipeline/Power, 3 Camera
     Subsystem sections, Radar, Fusion, HW Robustness & Components)
   - Patents & Innovation (0 sections — rolls up from `partner.patents[]`
     instead, not yet wired into any rollup view)
2. **Per-question priority** (`high`/`medium`/`low`) on all 252
   questions — for customer-meeting prep: High = cover live in the
   first technical meeting, Medium = cover if time allows, Low = fine
   as written follow-up. Corrected from an earlier draft that tagged
   whole *sections* — user pointed out every section has some
   genuinely important questions mixed with deep-dive detail, so
   priority needed to be per-question. Assigned by reading each
   question's content (not keyword heuristics), distribution: 44 high /
   98 medium / 110 low.
3. **Hero tagging on products** — `heroSensors`/`heroFunctions` arrays
   on each product (subset of whichever sensors/functions are checked
   true), for marking *this specific partner's* differentiating
   capability (e.g. ACC Function Detail becomes effectively high-priority
   for a partner whose hero product is ACC-based fusion, even though its
   static priority tag is lower). Explicitly NOT auto-detected — multiple
   heroes per product are allowed. Data model only; no toggle UI yet
   (`newProduct()` in app.js initializes both to `[]`; existing products
   in `data/partners.json` got the fields added additively).

**Comparison heatmap updated** to group by the new `domain` field
instead of its own hardcoded grouping (the hand-rolled
`COMPARISON_GROUPS` was functionally the same idea at finer granularity
— replaced with `comparisonGroups()`, computed from `schema.domains` +
`detailSection.domain` at render time, so there's one source of truth).
Patents & Innovation is skipped in the heatmap for now since it has no
sections to roll up — would need different metric logic (patent
counts/status, not question completion %) to show as a column.

Implementation: `docs/_extract/build_schema_sections.py`
(`DOMAINS`/`SECTION_DOMAIN`/`QUESTION_PRIORITY` dicts, with asserts
guaranteeing every section has a domain and every question has a
priority), `app.js` (`comparisonGroups()`, `newProduct()` hero fields),
`data/partners.json` (additive `heroSensors`/`heroFunctions` on existing
products). Verified via Playwright
(`C:\tmp\pwtest\test-domains.js`): every question has a valid
high/medium/low priority, every section has a valid domain, heatmap
shows exactly the 5 populated domains as columns, Partner Detail
unaffected, zero console errors.

## Priority sub-tabs UI — DONE

User clarified the priority work wasn't meant to stay data-only: the
actual expectation was that expanding a section (e.g. "Compute &
Hardware") shows 3 sub-tabs — High/Medium/Low — so the questions within
it are filterable by meeting-prep urgency, not just a flat list with an
invisible priority field. Implemented:

- `answerQuestionsTableHtml` now groups a section's questions by
  `priority` and renders a `.priority-tab-row` (3 pill buttons, each
  showing a live count e.g. "High (2)") plus 3 `.priority-panel` divs,
  only one visible at a time.
- Defaults to the **first non-empty tab in High → Medium → Low order**
  per section — so a section with zero High questions (e.g. Power &
  Ignition Management) opens on Medium or Low instead of an empty panel,
  verified working.
- Click handling in `handleDetailClick` (checked early, alongside the
  existing section-collapse handler) — pure DOM toggling, no `State`
  tracking, consistent with how section collapse/expand already works;
  resets to the default tab on re-render, which is fine.
- CSS: `.priority-tab`/`.priority-tab-high`/`-medium`/`-low` (red/amber/
  green pill buttons), print view always shows all 3 panels expanded and
  hides the tab row (same pattern as the section-collapse print
  override).

Verified via Playwright (`C:\tmp\pwtest\test-priority-tabs.js`): tab
counts match schema exactly (Compute & Hardware: High 2 / Medium 8 /
Low 5 = 15 total); clicking each tab swaps the visible panel correctly;
section collapse still works independently of which priority tab is
selected; zero console errors.

## Domain grouping on General/Product tabs — DONE

User clarified the domain field also wasn't meant to stay data-only —
it should visually group the section cards on the actual Partner Detail
page, not just power the Comparison heatmap. Implemented:

- `domainGroupedSectionsHtml(sectionEntries, renderSectionFn)` — shared
  helper used by both `generalTabHtml` and `productTabHtml`, groups a
  tab's sections under their `schema.domains` heading (in domain order),
  skipping any domain with nothing to show in that tab.
- General tab now shows 3 domain headings (Company Background,
  Perception Stack & Function Maturity, Safety & Cyber Security), one
  section each, since the 3 General sections happen to land in 3
  different domains.
- Product tab shows up to 5 domain headings depending on which
  sensors/functions are checked (Company Background, Perception Stack &
  Function Maturity, Regulation & Compliance, Hardware Capability — and
  notably **not** Safety & Cyber Security, since that domain's only
  member, Functional Safety & Cybersecurity, is a General section and
  therefore never appears on a Product tab; correct, not a bug).
- CSS: `.domain-group`/`.domain-group-heading` — bold uppercase heading
  with a navy underline, visually distinct from the section
  card-titles nested under it.

So the page now reads as: **Domain → Section → High/Med/Low tab →
Questions**, all three layers of categorization visible at once.

Verified via Playwright (`C:\tmp\pwtest\test-domain-grouping.js`) plus a
full-page screenshot: domain headings appear in the correct order on
both tabs, each containing exactly the right sections; total section
card count across all domain groups on the Product tab (31, with every
sensor/function checked) matches the full product-section count
exactly; zero console errors.

## Section + domain grading — DONE (NA/Developing/Good/Outstanding + justification)

New, orthogonal to per-question completion status: a section/domain can
be fully "Verified" question-by-question yet still graded "Developing"
in quality, or vice versa. Resolved decisions:
- Taxonomy: 4 tiers, NA/Developing/Good/Outstanding (`schema.gradeStatuses`)
  — renamed from the user's initial "Premature/Budding" combined term to
  the single word "Developing".
- Subsection grading follows the same General-vs-Product split as
  answers: General sections graded once per partner
  (`partner.sectionGrades`), Product sections graded once per product
  (`product.sectionGrades`) — verified independent per product.
- Domain grading is an independent holistic judgment, not auto-computed
  from subsections (`partner.domainGrades`), always partner-level.

**Mid-implementation correction**: my first pass put the domain
grade+justification controls inline in each `.domain-group-heading`
inside the General/Product tabs. User caught the flaw immediately: a
domain like "Company Background" has members in *both* General
(Company Overview) and Product (Production Readiness & Lifecycle)
categories, so its heading — and the same underlying partner-level
grade value — would render redundantly on the General tab AND on every
Product tab. Fixed by moving domain grading out of the tab content
entirely into a **dedicated sidebar card** (`domainGradingCardHtml`,
`#domain-grading-card`) placed next to the Decision card in
`renderDetailContent` — rendered once, page-agnostic, visible
regardless of which sub-tab (General/Product N/Patents/Notes) is
active. `domainGroupedSectionsHtml` reverted to a plain-text heading.

Implementation: `schema.json` (`gradeStatuses`), `server.py`
(`sectionGrades`/`domainGrades` on new-partner template),
`data/partners.json` (additive `sectionGrades` on partners+products,
`domainGrades` on partners), `app.js` (`gradeStatusLabel`, read-only
`getGeneralSectionGrade`/`getProductSectionGrade`/`getDomainGrade` for
rendering, mutating `ensureGeneralSectionGrade`/
`ensureProductSectionGrade`/`ensureDomainGrade` for
`handleDetailChange`, `sectionGradeRowHtml` inside each section card,
`domainGradingCardHtml` sidebar card), `style.css`
(`.section-grade-row`, `.domain-grade-sidebar-row`).

Verified via Playwright (`C:\tmp\pwtest\test-grading-v2.js`): zero
inline grade controls remain in domain headings on either tab; the
sidebar card shows all 6 domains and persists across sub-tab switches;
both domain and section grades + justifications save and reload
correctly; zero console errors.

## Comparison heatmap now driven by Master Category Grading — DONE

Caught a real gap: the Comparison heatmap still computed % of questions
Accomplished/Verified — it never read the new `domainGrades` at all, so
nothing entered in the Master Category Grading sidebar card showed up
on the management-facing Comparison page, defeating the point of
having a holistic grade. Fixed:

- `computeGroupCompletion`/`heatmapCellClass`/`heatmapCellHtml` (the old
  %-based versions) replaced with grade-based versions: each cell now
  shows the partner's manually-entered grade for that domain
  (`partner.domainGrades`), colored via the same red/amber/green scale
  (`hm-low`=Developing, `hm-mid`=Good, `hm-high`=Outstanding,
  `hm-empty`=ungraded or NA).
- **Explicit choice**: pure replacement, no % fallback for ungraded
  domains — they just show "—". No blended/dual-metric view.
- `comparisonGroups()` now also returns each group's domain `id` (not
  just label/sectionIds) so the heatmap can look up
  `partner.domainGrades` by domain id.
- **Overall column removed** — there's no defined "average grade"
  concept (grades are an independent holistic judgment per domain by
  design, not meant to be mechanically combined), so sort falls back to
  partner name alphabetically instead of by a computed overall score.
- `index.html` subtitle updated to describe the new metric instead of
  the retired % language.

Verified via Playwright (`C:\tmp\pwtest\test-heatmap-grade.js`): heatmap
shows all dashes before any grading; after grading 3 domains via the
sidebar card and saving, the heatmap cells show exactly those grades
with the correct color class; zero console errors. (One red herring
during testing: an intermediate run showed stale data from a race
during rapid server stop/restart, not a real bug — resolved by
confirming via direct API call before re-testing.)

## Next steps round — DONE: radar chart, hero-tag UI, Overview hero stat

All 3 asks below implemented in one pass. Decisions that the previous
session flagged as open were resolved pragmatically rather than re-asked,
noted per item.

1. **Comparison radar chart** — added alongside the heatmap (not a
   replacement — radar gives at-a-glance shape, heatmap gives precise
   per-domain lookup, per the "keep both" option the previous session
   left open). Chart.js vendored locally at `static/lib/chart.umd.min.js`
   (not a CDN tag) so the app has no runtime internet dependency,
   loaded in `index.html` before `app.js`.
   - One radar axis per populated domain (same 5 domains
     `comparisonGroups()` already returns for the heatmap columns).
   - Grade → number mapping: `outstanding`=3, `good`=2, `developing`=1,
     `na`/ungraded=0 — plotted at 0 rather than excluded from the axis
     (one consistent rule instead of per-partner special-casing).
   - Partner picker: toggle pills above the chart, max 4 selected at
     once (`RADAR_MAX_PARTNERS`), defaults to the first 3 partners
     alphabetically. Picking a 5th toasts an error instead of silently
     dropping one. `State.radarSelected`/`State.radarChart` track
     selection and the live Chart.js instance (destroyed/rebuilt on
     every selection change).
   - Implementation: `index.html` (`#radar-partner-picker`,
     `#radar-chart` canvas, new card above `#comparison-body`),
     `app.js` (`renderComparisonRadar`, `gradeToScore`, called from the
     end of `renderComparison`).
2. **Hero product marking UI** — new sidebar card `heroProductsCardHtml`/
   `#hero-products-card`, mirroring `domainGradingCardHtml`'s
   page-agnostic placement (rendered once in `renderDetailContent`,
   sits directly below Master Category Grading, visible regardless of
   active sub-tab). One block per product; only sensors/functions
   already checked true on that product render as toggleable star
   pills (`★ Radar`, `★ AEB`, etc.) — matches the data-model comment
   that was already in `newProduct()`.
   - Click toggles `data-toggle-hero-sensor`/`data-toggle-hero-function`
     in `handleDetailClick`, same in-place `classList.toggle('on', …)`
     pattern as the existing business-model pills — no card re-render
     needed for the click itself.
   - `refreshHeroProductsCard()` added to `refreshDetailTabsAndPanels()`
     so the candidate-pill list stays in sync when a product is
     added/removed or a sensor/function is toggled.
   - **Consistency fix while implementing**: unchecking a sensor/function
     in `tryToggleScopedField` now also strips that key out of
     `heroSensors`/`heroFunctions` — a capability the product no longer
     has can't stay tagged "hero". Not explicitly asked for, but the
     plan's own wording ("can't be a hero of a capability it doesn't
     have") implied it; silent cleanup, no confirmation dialog (separate
     from the existing answer-data-loss confirmation, which still gates
     on answered questions/notes same as before).
   - CSS: `.hero-product-row`/`.hero-product-name`, `.hero-pill.on`
     (amber/gold, distinct from the green `.toggle-pill.on` used
     elsewhere).
3. **Overview hero stat** — 4th stat card, "Hero Capabilities", added
   next to Partners/Shortlisted/Products. Metric chosen: total
   hero-tagged sensor/function instances across the whole portfolio
   (a product with 2 hero tags counts as 2) — picked over "partners
   with ≥1 hero tag" because a raw differentiator count is more useful
   for "how much have we tagged" than a partner headcount that
   duplicates the Partners card above it.
   - Needs full partner records (hero arrays aren't in the lightweight
     summary list `State.partnersSummary` already used for the other 3
     cards), so it fetches separately via the same `Promise.all`
     pattern `renderComparison` uses, async after the other 3 stats
     render synchronously (shows "…" briefly, then the count).
   - Implementation: `app.js` (`renderHeroStat`, called from
     `renderOverview`).

**Verified via Playwright** (`C:\tmp\pwtest\test-next-steps.js`,
`test-radar-data.js`): hero pill toggle persists through save/reload;
Overview stat goes from 0 → 1 after tagging one capability; radar canvas
renders with correct per-domain values matching the heatmap exactly
(confirmed `State.radarChart.data` directly — Hardware Capability=3
after grading it Outstanding, all other axes 0); heatmap table still
renders unchanged alongside the new radar card; zero console errors
across all flows. Screenshots confirm visual placement (radar above
heatmap on Comparison; Hero Capabilities card between Master Category
Grading and Hard Disqualifiers on Partner Detail; 4th stat card on
Overview).

## Corrections after second review — hero scope + comparison orientation — DONE

User caught two things wrong with the round above, both fixed same session:

1. **Hero tagging was at the wrong granularity.** My first pass let you
   star individual sensors/functions within a product
   (`heroSensors`/`heroFunctions` arrays). User's actual model: hero is a
   property of the *whole product* — e.g. partner XYZ's "Product A" (which
   might bundle radar+camera+ACC) is itself the hero, not one piece inside
   it. A partner with products A/B/C can have A and B both hero, C not.
   Fixed by replacing the data model and UI entirely:
   - `newProduct()` now sets `isHero: false` (boolean) instead of
     `heroSensors: []`/`heroFunctions: []`.
   - `heroProductsCardHtml()` renders one star pill per product (not per
     capability) — "Hero Products" card, same page-agnostic sidebar slot.
   - `handleDetailClick` has a single `data-toggle-hero-product` branch
     replacing the two per-capability ones; the `tryToggleScopedField`
     hero-cleanup-on-uncheck logic from the first pass was reverted (no
     longer applicable — toggling a sensor/function doesn't touch hero
     status now).
   - `data/partners.json` migrated: existing `heroSensors`/`heroFunctions`
     arrays dropped, replaced with `isHero` (the one test product that had
     a hero sensor tagged became `isHero: true`, preserving the signal
     that *something* on it had been marked hero rather than silently
     losing it).
   - Overview stat relabeled "Hero Products" (was "Hero Capabilities"),
     now counts hero-tagged products portfolio-wide instead of
     hero-tagged capability instances.
2. **Comparison heatmap orientation didn't match the reference.** User
   pointed at the pre-refactor main branch's Comparison page (`git show
   main:static/app.js` — `renderComparison`, score-matrix table) as the
   structure to take cues from: rows = categories (there: weighted
   sections; now: domains), columns = partners. The version I'd built
   had it backwards (rows = partners, columns = domains). Flipped to
   match: `renderComparison`'s table now has one `<tr>` per domain, one
   `<td>` per partner; partner names move to clickable `<th>` cells in
   the header (replacing the old clickable-row-label-in-first-column
   pattern) and still call `openDetailFor`. Did **not** pull in the old
   sheet's other two pieces (click-to-drill-down side chart,
   side-by-side radar+detail layout) — user's answer only confirmed the
   row/column orientation, not those.
   - CSS: `.hm-partner-col`/`.hm-partner-name` renamed to
     `.hm-domain-col`/`.hm-domain-name` (now the sticky first column);
     new `.hm-partner-header` for the clickable column headers.

**Verified via Playwright** (`C:\tmp\pwtest\test-hero-v2.js`): Hero
Products card shows exactly one pill per product (not per sensor/
function); toggling Product 2's pill, saving, and reloading shows both
Product 1 and Product 2 marked hero; Overview stat reads exactly 2;
Comparison table header reads `Domain, gahan, temp` (partners as
columns) with 5 domain rows; clicking a partner's column header
navigates to their Partner Detail page; zero console errors. Screenshot
confirms the table visually matches the old sheet's row/column
structure with the radar chart still stacked above it.

## Earlier "Next steps" framing (superseded — implemented, see "Next steps
round — DONE" and the corrections section above)

## Next steps — sequenced to avoid rework (2 of 6 DONE; 3 PLANNED, 1 ON HOLD)

These were gathered across several follow-ups in whatever order the user
raised them, but that's *not* a safe build order — several items would
need rework if built before something they depend on. Re-sequenced here
by dependency, not by when each was asked. Rule used: **anything that
changes how questions are labeled/structured goes first; anything that
documents or exports the finished result goes last**, so nothing has to
be revisited once the thing it depends on lands.

**Step 1 — Dotted question numbering. DONE.** Foundational: every other
item below either displays questions (Product Comparison, the export
refresh, How To) or adds to the question set (question authoring). Built
first so those can show/use the real `X.Y.Z` label from day one instead
of being built against plain `qId` and reworked later to add it.

> Maps directly onto the existing 3-level hierarchy: `schema.domains`
> (master, 6) → `detailSections` (sub-category, 34, each tagged with a
> `domain`) → `detailQuestions` (252, each tagged with a `sectionId`).
> `1.2.5` reads as: 1st domain, 2nd section within that domain, 5th
> question within that section.
> - **Computed display label, not a new stored field.** The existing
>   global integer `qId` stays the real identifier — every
>   `generalAnswers`/`product.answers` record is keyed on it, untouched.
>   The dotted label is derived at render time from current
>   domain/section/question order via a new `questionLabel(q)` helper in
>   `app.js` (right after `questionsForSection`), which replaced the
>   plain `q.id` previously shown in the `q-num` span of every question
>   row (`answerRowHtml`). `.q-num`'s grid column in `style.css` was
>   widened from 28px → 40px to fit the longer worst-case label
>   (`2.18.26`). Verified in-browser via Playwright on a real partner's
>   General and Product tabs — labels compute correctly across all 6
>   domains and vary correctly per section/question (e.g. `2.10.1` on
>   ACC Function Detail, `2.17.1`/`2.17.6` on Software Quality).
> - **Positional, so it can drift.** If a section is reordered, or a
>   question is inserted ahead of others in the same section instead of
>   appended, every label after that point shifts. Matters once Step 2
>   (question authoring) exists — new questions should append to the
>   end of their section's question list, not insert mid-list, so
>   existing frozen numbers don't move out from under anyone who's
>   already referencing them (e.g. in a meeting agenda or an external
>   doc).
> - Domains with zero sections (Patents & Innovation) and sections with
>   zero questions (the 6 placeholder sections noted earlier, if still
>   empty) simply don't produce any `X.Y.Z` labels — nothing special
>   needed for those.
> - Consumed by Step 3 (Product Comparison row labels) and Step 6 (How
>   To, if a numbered reference turns out to help there) — built first
>   specifically so those don't need to retrofit it.

**Step 2 — In-app question authoring, with a publish/scope choice. DONE.**
Goes right after numbering (Step 1) for the reason above, and before
Product Comparison/export (Steps 3-5) since both of those read the
question list this step extends — building them first would mean
revisiting their question source once drafts/publishing exists. Lives
**inside each section card** (a "+ Add Question" button in the card
body, in the existing General/Product tab UI), not a separate admin
page.

> **Two deliberate deviations from the original sketch below, found
> while implementing:**
> - **Draft ids are negative integers, not `"draft-<uuid>"` strings.**
>   `handleDetailChange` parses every answer key with `parseInt(...)`
>   (e.g. `general:42` → `ensureGeneralAnswer(parseInt("42"))`); a string
>   id would `parseInt` to `NaN` and silently break answer storage (every
>   keystroke pushing a new `{qId: NaN}` row instead of updating one).
>   Negative integers round-trip through that exact same logic with zero
>   special-casing, can never collide with a real qId (always ≥ 1), and
>   double as the draft/published signal — `q.id < 0` ⇒ draft, so no
>   separate `status: 'draft'` field is stored at all.
> - **Publish auto-saves the partner immediately**, rather than staging
>   the draft-removal/re-key for the user's next manual Save. The
>   schema.json write is immediate and irreversible the moment Publish
>   is clicked; leaving the partner-side bookkeeping unsaved risked a
>   Discard afterward leaving the question live globally *and* still
>   sitting in local drafts.

   - **New question starts as a partner-local draft.** Stored on the
     partner record (`partner.draftQuestions: [{ id, sectionId, text,
     priority }]`), *not* in `schema.json`. Renders mixed into that
     section's existing question table for that partner only (merged via
     a new `questionsForSectionAll(sectionId)`, used everywhere a
     section's questions feed into rendering, answer-clearing, or the
     "does this section have saved data" check — so unchecking a
     sensor/function correctly protects or clears a draft's answer
     exactly like any published question's), with a "Draft" badge,
     answerable through the same `partner.generalAnswers`/
     `product.answers` mechanism keyed off the draft id.
   - **"Publish" promotes it into the global schema** — new endpoint
     `POST /api/schema/questions` validates `sectionId`/`text`/
     `priority`, computes `next qId = max(existing qIds) + 1` (first
     published question landed on 253, schema having run a clean,
     gap-free 1–252), appends to `schema.detailQuestions` with
     `sourceRef: null` (like the manually-authored Radar/Fusion/BSD/etc.
     questions already are), and persists via a new `save_schema()` —
     the exact same atomic temp-file pattern as the existing
     `save_partners()`. Always appends, never inserts mid-array, so
     Step 1's "existing dotted numbers never shift" guarantee holds.
     Client-side, the draft is then removed from
     `partner.draftQuestions` and the partner's own answer (if any) is
     re-keyed from the draft id to the new qId, then the whole partner
     record is immediately saved (see the auto-save note above) — both
     verified end-to-end with Playwright: the re-keyed answer's remarks
     survived the round trip intact.
   - **Verified this propagates with zero extra code, exactly as
     predicted**: published a question under "Validation & Test
     Infrastructure" on one partner, then opened a *different* partner
     and confirmed it appeared there immediately, unanswered, with a
     normal dotted number (`2.1.18`) — `questionsForSection(sectionId)`
     reads straight from the global list, so every product/partner whose
     section scope matches just picks it up on next render.
   - **"Keep relevant only to this partner"** = simply never publishing
     it — no separate action needed, draft stays partner-local
     indefinitely.
   - **Remove a published question — DONE.** A follow-up ask: there was
     no way to remove a question once published, and that needed to
     apply to the original 252 default questions too, not just anything
     authored via this step — there's no code-level distinction between
     them once in `schema.detailQuestions`. Dotted numbering needed zero
     new code for this: it's computed at render time from current array
     position (Step 1), so deleting a question automatically renumbers
     everything after it in that section on the very next render.
     The real work was that other partners' answers to that question
     live in their own saved records, not loaded in the current session
     — removal has to sweep everywhere or it silently leaves orphaned
     answers (or, worse, a later unrelated Save on this partner could
     resurrect them from stale in-memory state). Built as: a small ✕
     icon next to each published question's dotted number
     (`data-remove-question`, `.q-remove-btn` in style.css — draft rows
     keep "Discard draft" only, untouched); a `GET
     /api/schema/questions/<id>/usage` impact check that scans every
     partner's `generalAnswers`/`product.answers`; and a `DELETE
     /api/schema/questions/<id>` that removes it from `schema.json` and
     sweeps the same qId out of every partner's saved answers in one
     pass, returning how many it cleared. **No new UI component** — the
     confirm reuses the exact double-`confirm()` idiom already used for
     "uncheck a sensor that has saved data" (`tryToggleScopedField`):
     first shows the breakdown as plain text (native `confirm()` already
     renders `\n` as line breaks — "• gahan — General", "• temp —
     Product 2", etc.), second is the final "cannot be undone" gate; a
     question nobody has answered just gets one plain confirm, same as
     removing an empty product/patent. Verified end-to-end with
     Playwright, including the actual cross-partner case: published a
     question, answered it from two different partners, removed it from
     a third's view, and confirmed via direct API checks that *both*
     partners' saved records and `schema.json` no longer reference it.
   - **Open, deliberately deferred**: editing a published question's
     text/priority afterward (would retroactively change it for every
     partner that already answered it, since it's one shared record —
     not addressed here). "Unpublish" doesn't exist — one-way by design.
     Drafts are *not* excluded from CSV/PDF export or the Comparison
     heatmap rollup, but this is moot for now: CSV export doesn't emit
     per-question data at all today (only partner-level summary columns),
     and the heatmap reads domain grades, not question completion — so
     nothing to exclude yet. No auth/roles exist in this app, so "who can
     publish" has no gating, same as everything else.
   - **Status filter + NA-grey — DONE.** User's
     follow-up: keep the High/Medium/Low priority tabs exactly as they
     are, but add a second, independent way to narrow what's showing by
     **answer status** (NA / Yet to Start / In Progress / Accomplished /
     Verified), plus grey out NA rows so the eye goes to what still
     needs attention. Deliberately **filter, not sort** — the dotted
     numbers (Step 1) are meant to read in document order, and reordering
     rows by status would undercut that; filtering gets the same
     "show me what I care about" value without disturbing it.
     - **One filter control per tab, not per section.** A
       `.toggle-pill-row` (reusing the exact pill styling already used
       for Hero Products/business model/sensors), rendered once at the
       top of `generalTabHtml`/`productTabHtml` — labels sourced straight
       from `schema.answerStatuses` (`na`, `yet_to_start`, `in_progress`,
       `accomplished`, `verified`) plus an "All" pill, so it needs no new
       schema entry and stays in sync if that list ever changes. One
       shared `State.statusFilter` value (default `'all'`) applies
       across General and every Product tab — switching tabs keeps
       whatever filter you had selected, same as `State.activeDetailTab`
       already persists across renders.
     - **Filtering happens inside `answerQuestionsTableHtml`**, right
       before the existing High/Med/Low grouping (one line: when
       `State.statusFilter !== 'all'`, drop any question whose
       `getAnswer(q.id).status` doesn't match) — every count, every
       empty-panel message, every existing priority-tab behavior below
       that point is reused completely unchanged, since they already
       just operate on whatever array they're handed. Clicking a filter
       pill sets `State.statusFilter` and calls the existing
       `refreshDetailTabsAndPanels()` — no new render path.
     - **Deliberately not doing the cross-partner-data plumbing this
       time**: `questionsForSectionAll` (the merge-in-drafts helper from
       Step 2) stays completely unfiltered — the status filter is purely
       a *display* concern in the rendering layer, so it must never touch
       `sectionHasAnswerData`/`tryToggleScopedField`'s clearing logic or
       the dotted-numbering calculation, both of which need to keep
       seeing every question regardless of what's currently filtered
       on-screen.
     - **A section with zero rows left after filtering just shows the
       existing "No {priority}-priority questions" empty state for all
       three tabs** rather than collapsing the whole card — zero extra
       logic, reuses what's already there. Flagged as a possible later
       polish (collapsing fully-filtered-out section cards) if 18+ near-
       identical empty cards turns out to be noisy in practice — not
       solving for that pre-emptively.
     - **Print/export reflects whatever the filter is currently set
       to** — unlike priority tabs (which hide already-rendered panels
       via CSS, so print can force them back with `display:block
       !important`), the status filter drops non-matching questions
       *before* they're ever rendered into HTML, to keep the
       implementation to one filter line reusing the existing grouping
       code untouched. That means filtering to "Yet to Start" and then
       hitting Print/PDF prints only those rows — switch back to "All"
       first for a complete printed sheet. Simpler to implement and
       arguably more intuitive (what you see is what prints) than
       silently expanding the printed output beyond the current screen,
       but it's the opposite of priority tabs' existing print behavior,
       so worth knowing about going in.
     - **NA-grey is a separate, independent change**: add
       `data-row-status="${ans.status}"` to every `.ans-row` (draft and
       published alike) plus `.ans-row[data-row-status="na"] { opacity:
       .55; }` in style.css. Needs exactly one extra line in
       `handleDetailChange`'s existing `data-ans-status` branch to keep
       that attribute in sync the moment the status dropdown changes,
       mirroring how the `print-val` sibling is already kept in sync
       there today.
     - **Explicitly skipped for v1**: live counts on the filter pills
       themselves (e.g. "Yet to Start (45)") — would need tallying every
       question across every section on the current tab before the pill
       row renders, which is a real but separable enhancement, not
       required to deliver "filter based on my interest."
     - **One adjustment found while building**: the "print is unaffected
       by the filter" idea above didn't survive contact with the
       simplest implementation — see the corrected note in that bullet.
       Filtering removes rows before they're rendered (one line, reuses
       all the existing grouping/counting code untouched) rather than
       hiding already-rendered rows via CSS, so print now follows
       whatever filter is active on screen. Verified end-to-end with
       Playwright: NA selection greys the row live (`data-row-status`
       synced from the status dropdown, `opacity: .55` confirmed via
       computed style); the NA filter pill correctly narrowed a 7-row
       section to exactly the 1 row just marked NA; the filter persisted
       across a General → Product tab switch (shared `State.statusFilter`);
       resetting to "All" restored all 7 rows. No console errors.
     - **Discoverability fix after first real-world test**: the filter
       row renders once near the top of each tab, but on a long tab
       (18+ sections) it scrolled out of view long before reaching
       sections like "Software Quality" — found because the user went
       looking for a way to filter/sort right there, next to that
       section's own STATUS column header, and couldn't find it. Fixed
       by making `.status-filter-row` `position: sticky; top: 52px`
       (the exact height of `.topnav`, which is already sticky at
       `top: 0`) with an opaque `var(--gray-100)` background — same
       page background as everywhere else — so it now stays pinned
       just under the top nav no matter how far down the tab you've
       scrolled. Confirmed via screenshot scrolled to "Software
       Quality" and re-ran the filter Playwright check afterward —
       still narrows/resets correctly. **User-confirmed working** in
       their own browser session after a hard refresh.

**Step 3 — Product Comparison.** New sub-section on the Comparison
page, sibling to the existing partner-level heatmap/radar. Placed after
Steps 1-2 because it displays the question list those steps shape (the
dotted label, and potentially partner-local drafts/published questions).
Goal: compare product-category questions/answers side by side across
2-4 specific products (which may belong to different partners — e.g.
Partner A's radar-only product vs. Partner B's fusion product), not
whole partners. Approved approach, not yet built:
   - **First** — "How many products to compare?" (2/3/4, same idea as
     the radar partner-picker's `RADAR_MAX_PARTNERS` cap).
   - **Then** — that many dropdowns appear, each listing every product
     across every partner, labeled `{Partner Name} — {Product Name}`
     (a flat product name alone is ambiguous once you're comparing
     across partners). Source data: the same full-partner fetch
     `renderComparison` already does via `Promise.all` — no new
     endpoint needed, just flatten `partners[].products[]`.
   - **Then** — table renders with the master/left column as
     Domain → Section → Question (same ordering
     `domainGroupedSectionsHtml` already uses on Partner Detail, just
     flattened to rows instead of cards, and **product-category
     sections only** — General questions don't belong to a product so
     they're excluded here), one column per selected product showing
     that product's answer status as a `.status-pill` (reusing the
     badge classes added for the How To page).
   - **Applicability / the NA-for-this-product case** — user's example:
     a Fusion-equipped product might have ~70 applicable questions, a
     Radar-only product ~50, with only ~40 sections in common. For a
     (question, product) pair where the question's section doesn't
     scope-match that product, the cell must look *visually distinct*
     from a real "NA" answer — those mean different things (the
     evaluator deliberately marked a question NA, vs. the question
     plain doesn't exist for that product type) and showing both the
     same way would be misleading. Plan: reuse the existing
     `sectionScopeMatches(section, prod)` / `sectionHasAnswerData(section,
     prod)` helpers (the same "sticky" logic Partner Detail already
     uses) — if neither holds, render a grey, lower-opacity cell reading
     "N/A — not applicable to this product" (a new `.cmp-inapplicable`
     style, distinct from the `.status-na` pill used for a genuine
     answered-NA).
   - **Row volume** — product-category sections run into the hundreds of
     questions combined, so a flat table would be unusable. Group rows
     under collapsible Domain → Section headers, same collapse pattern
     `.q-section-card`/`data-section-toggle-header` already uses on
     Partner Detail, rather than inventing a new collapse mechanism.
   - **Navigation** — clicking a product's column header jumps to that
     product's tab on its Partner Detail page (`openDetailFor(partnerId)`
     then set `State.activeDetailTab = 'product:' + productId`, mirroring
     how `+ Add Product` already focuses the new product's tab).
   - Not yet decided: whether Partner Response/L&T Remarks show inline
     (tooltip on hover, given how much table real estate is already
     spent on N product columns) or only on click-through to the
     product's own tab — leaning toward click-through only, to keep
     the comparison table itself scannable.

**Step 4 — Product Grade Radar — ON HOLD, user wants to rethink the
whole proposal.** Sits here in the sequence (right after Product
Comparison, since it would reuse that step's `{Partner} — {Product}`
product-picker labeling) only for reference — it's paused, not next in
line. Was about to be a second radar next to the existing Domain Grade
Radar on the Comparison page, scoped to products instead of partners.
After the axis-level and grade-source decisions below got worked out,
user said to skip it for now and rethink — so treat everything below as
a discarded first draft, not a spec to pick back up directly. Last
input before pausing: per-product grading control would sit either
above "Company Background" or below each product's sensor/function spec
section — neither confirmed, both just spitballed before the pause.
Re-open this from scratch next time rather than resuming partway
through, and re-decide where it actually belongs in the sequence once
it has a real design again.

   *Discarded first-draft design, kept only for reference:*

   Rationale: maturity sometimes needs checking at the
   product level rather than the company level (e.g. one partner's two
   products can be at very different maturity, which a partner-wide
   domain grade can't show). Design decided, not yet built:
   - **Axis level: master domain (4 axes), not sub-category/section.**
     Worked through the actual numbers rather than guessing:
     - It's **4 domains, not 5/6.** Two drop out for products, not one:
       Patents & Innovation (0 sections at all, already excluded from
       the partner radar too) *and* Safety & Cyber Security (its only
       member, Functional Safety & Cybersecurity, is a **General**
       section — zero Product-scoped sections, so there's nothing
       product-level to grade there; this is the same fact already
       behind Product tabs never showing a Safety & Cyber Security
       heading). Remaining: Company Background, Perception Stack &
       Function Maturity, Regulation & Compliance, Hardware Capability.
     - Sub-category level was rejected, not on count alone (31 product
       sections worst case) but because the *axis set itself* isn't
       shared across the products being compared — a radar-only
       product has nothing meaningful under Camera Subsystem, a
       camera-only product has nothing under Radar/Fusion. Comparing
       largely non-overlapping axes makes the radar shape comparison
       apples-to-oranges, and reintroduces the same ambiguity flagged
       for Product Comparison's NA case (axis=0 because ungraded vs.
       axis=0 because the section doesn't apply — indistinguishable on
       a radar with no room for a third visual state per axis).
     - Master-domain level mostly sidesteps the NA problem for free:
       each of the 4 domains has at least one *product-common*
       (not sensor/function-scoped) section — e.g. Hardware Capability
       always has Compute/SW-Arch/Pipeline/Power regardless of which
       sensors are checked — so nearly every product has *something*
       gradable in every domain, unlike individual sections.
   - **Data gap, resolved: manual per-product domain grading, not
     auto-computed.** `partner.domainGrades` today is explicitly
     partner-level only and a deliberate holistic judgment, "not
     something to approximate mechanically from question-answer
     counts" — there's currently no per-product domain grade to plot
     at all. Decided to add a parallel manual grading surface
     (`product.domainGrades`, same shape as `partner.domainGrades` but
     scoped to just the 4 product-relevant domains) rather than
     auto-rolling-up `product.sectionGrades`, to stay consistent with
     that same philosophy rather than re-introducing the exact pattern
     it rejected at partner level.
   - **Not yet decided**: where the per-product grading control lives
     (a mini grading card per product — inline on each Product tab vs.
     a sidebar card like Master Category Grading, but this time one
     per product instead of one per partner); and the product-picker
     UX for the radar itself (reuse the same 2-4 picker pattern as the
     partner radar, but products need the `{Partner} — {Product}` label
     from Step 3 (Product Comparison) since names alone are ambiguous
     across partners).

**Step 5 — Redefine CSV/PDF export to match the current design.**
Placed after Steps 1-3 deliberately: exports should reflect the
*finished* data model, not get audited now and re-audited again once
numbering/question-authoring/Product Comparison land. Both
`/api/export/csv` (server-side) and the print/PDF view (client-side, the
`print-target`/`print-val` CSS pattern) predate the
domain/section/grading/hero-tag/patents work and likely still reflect an
older shape. Needs an audit pass (not yet done) of:
   - `server.py`'s CSV export columns vs. what data actually exists now
     (domainGrades, sectionGrades, isHero, patents, partnerResponse).
   - The print view's coverage of the same — sidebar cards
     (`domain-grading-card`, `hero-products-card`) currently aren't
     part of `.print-target` at all (they sit in `.detail-sidebar`,
     need to check whether that's included in print output already or
     needs explicit `print-val` mirrors like the rest of the form
     fields use).
   - Decide scope: just bring exports up to date with existing fields,
     or also reflect whatever new fields Step 2 (question authoring)
     introduces (drafts probably shouldn't export until published —
     ties into that step's open question about export/heatmap
     treatment of drafts).

**Step 6 — "How To" tab, LAST on purpose.** A how-to-use page should
document the *finished* feature set — building it earlier would mean
rewriting it after every step above ships (numbering, question
authoring/publish, Product Comparison, export). First pass (4 cards of
prose + a legend table + one small box diagram) was rejected anyway:
too much text, nobody will actually read it. Explicit correction:
**this page has to be a full visual representation, minimal text,
self-explanatory at a glance** — not a written explainer with a diagram
bolted on, the diagram/visual *is* the explanation. The current
`#page-howto` markup, the `.howto-*` CSS, and the `How To` nav tab are
still in the codebase but should be treated as a rough draft to
replace, not a finished feature. Re-design needed before touching code
again — open questions for next session: a single big infographic-style
flow (icons/color instead of paragraphs) vs. a short interactive
click-through; how much of the status/grade taxonomies can be conveyed
as color/icon legends alone vs. needing any words at all; whether this
should stay a static page or become something users step through once;
and now that it's last in the sequence, it can also show off whatever
Steps 1-5 actually shipped (dotted numbering, drafts/publish, Product
Comparison, the refreshed exports) instead of describing a moving
target. The `.status-pill`/`.status-na`-family CSS classes added
alongside the first attempt are still worth keeping regardless of how
this page gets redesigned — they're reusable status badges, not
specific to this page's layout.

## Other open items (lower priority, no urgency)


1. **Confirmed gap: Patents & Innovation is missing from both the
   Comparison heatmap and the radar chart.** `comparisonGroups()` only
   returns domains with at least one mapped section (`sectionIds.length
   > 0`); Patents & Innovation has zero (it rolls up from
   `partner.patents[]`, not `detailQuestions`/`detailSections`) and gets
   filtered out before either `renderComparison`'s table or
   `renderComparisonRadar` ever see it — so the radar only ever plots 5
   axes, never 6. Needs different rollup logic than the other domains
   since patents don't have a grade taxonomy the same way (no
   NA/Developing/Good/Outstanding per patent today) — e.g. a patent
   count or a lifecycle-stage distribution instead of a single grade
   value, which the radar's 0-3 numeric-score axis can't directly
   represent without its own mapping. Not designed yet — deferred until
   there's a clearer idea of what number/grade should represent a
   partner's patent portfolio on one axis.
2. Possible follow-up: revisit whether some of the very small sections
   (Power: 2 questions, LDW/LKA: 1 question, Pipeline Architecture: 2
   questions) should be merged into a neighboring section for less tab
   clutter — low priority, easy to change later.
3. Noted but not actioned: user feels the pre-refactor master-branch UX
   was more visually polished/appealing than the current rebuild. A
   general UI-polish pass is a separate, not-yet-scoped task.
