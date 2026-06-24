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

## Next steps — sequenced to avoid rework (4 of 7 DONE; 3 PLANNED)

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
   - **Priority filter (extends the status filter) — DONE.** Same idea
     as the status filter, on `q.priority` instead of answer status,
     combined via AND (e.g. "High priority AND Yet to Start" at once).
     - Folded into the **same** sticky row as the status filter, renamed
       `.status-filter-row` → `.detail-filter-row` (now `display:flex`
       with two independent filter groups side by side) rather than a
       second sticky row needing its own `top` offset.
     - Pills sourced from the existing `PRIORITY_TABS` constant — no new
       data needed.
     - Both conditions live in one filter line in `answerQuestionsTableHtml`.
     - Added to the edit-mode allowlist in `handleDetailClick` alongside
       `data-status-filter`, exactly as planned.
     - **Real bug caught by testing in read-only mode specifically**: the
       CSS dimming rule for pills (`.detail-readonly .toggle-pill:not(.readonly)
       { pointer-events: none }`, added for item 4 above) is broad enough
       to also catch the filter pills, since they're plain `.toggle-pill`
       spans too — this silently blocked clicking *either* filter while
       read-only (the default state!), even though the JS allowlist
       already correctly permitted it. Never caught earlier because the
       status filter shipped *before* read-only-by-default existed, so
       the combination was never exercised until now. Fixed with a
       higher-specificity override: `.detail-readonly .detail-filter-row
       .toggle-pill { pointer-events: auto !important; opacity: 1 !important; }`.
     - Verified via Playwright in both read-only and edit mode: Low
       narrowed 7 rows to 4; combining with an NA status filter narrowed
       further (AND logic confirmed); resetting both restored all 7;
       clicking either filter while read-only no longer blocked and
       didn't kick the page into edit mode; clicking while editing didn't
       drop any in-progress edits. No console errors.
     - Per-section High/Med/Low tabs degrade exactly as predicted (e.g.
       "High (7) Medium (0) Low (0)" when filtered to High) — confirmed
       visually, not a new edge case.
   - **Follow-up, same day — removed the per-section High/Med/Low
     sub-tabs entirely. DONE.** Now that the global priority filter
     covers that need across every section on the tab at once, the old
     per-section tabs (one section at a time, "(N)" counts) were pure
     redundancy. `answerQuestionsTableHtml` collapsed from a
     tab+panel-switching structure to one flat list per section (still
     respecting both filters); `priorityPanelHtml` and
     `jumpSectionCardToPriorityTab` deleted outright (the latter only
     ever existed to handle a newly-added/changed draft landing in a
     tab that wasn't active — moot with no tabs left), along with the
     dead `[data-priority-tab]`/`[data-priority-panel]` branch in
     `handleDetailClick` and the now-unused `.priority-tab`/
     `.priority-panel` CSS. Each row keeps its priority visible via a
     colour-coded left edge instead (`.ans-row[data-priority="high|
     medium|low"]`, `box-shadow: inset` rather than `border-left` so it
     doesn't add layout width and throw the columns out of alignment
     with the header row above). Verified via Playwright: a 19-question
     section (7 High + 8 Medium + 4 Low) now renders as one list with
     the edge colour present on every row; the global priority filter
     still narrows it correctly (Low → 4); a newly-added draft appears
     immediately with focus, no tab-jump needed; changing a draft's
     priority updates its edge colour in place without the row
     vanishing. No leftover references to the removed code anywhere in
     `app.js`/`style.css`/`index.html` (confirmed by grep). No console
     errors.

**Step 3 — Product Comparison. DONE.** New sub-section on the Comparison
page, sibling to the existing partner-level heatmap/radar. Placed after
Steps 1-2 because it displays the question list those steps shape (the
dotted label, and potentially partner-local drafts/published questions).
Goal: compare product-category questions/answers side by side across
2-4 specific products (which may belong to different partners — e.g.
Partner A's radar-only product vs. Partner B's fusion product), not
whole partners.
   - **First** — "How many products to compare?" (2/3/4, same idea as
     the radar partner-picker's `RADAR_MAX_PARTNERS` cap). **Confirmed:
     count + N dropdowns, not the radar's toggle-pill multi-select** —
     product labels are long (`Partner Name — Product Name`) and the
     full cross-partner product list could span many partners, so a
     long pill row would scan worse than clean per-slot dropdowns, even
     though it's a different interaction pattern than the radar picker
     on the same page.
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
   - **Confirmed: Partner Response/L&T Remarks show via hover tooltip**
     on the status pill, not click-through-only — chosen over the
     simpler click-through option despite the added complexity (won't
     work on touch or in print/PDF, both acceptable tradeoffs here since
     this table is a screen-only comparison view, not part of the
     per-partner exported record).
   - **Confirmed: lives as a new sub-tab/toggle on the Comparison page**
     (e.g. "Partners" / "Products"), not stacked below the existing
     heatmap+radar — keeps the partner-level and product-level views
     each focused instead of one page that mixes both plus a
     hundreds-of-rows product table.
   - **Implementation notes.** `renderComparison()` now caches
     `{ fullPartners, groups }` in a module-level `comparisonCache` so
     toggling the new "Partners"/"Products" sub-tab never re-fetches —
     only a fresh page visit does (verified via Playwright: 0 network
     calls during a sub-tab switch). The existing heatmap+radar logic
     was extracted unchanged into `renderComparisonPartnersView`, called
     from both the initial render and every switch back to "Partners."
   - **Drafts deliberately excluded** — section rows use
     `questionsForSection` (schema-only), not `questionsForSectionAll`.
     Drafts are partner-local with ids generated independently per
     partner (negative integers starting at -1 each), so the same id can
     mean two unrelated questions on two different partners — comparing
     across partners by id would be actively wrong here. Caught a related
     bug while building: `sectionHasAnswerData` (the shared "sticky"
     helper) internally calls `questionsForSectionAll`, which reads
     `State.detailPartner.draftQuestions` — exactly the partner currently
     open on *Partner Detail*, not whichever partner a given Product
     Comparison column belongs to. Used a local `cmpSectionHasAnswerData`
     (schema-only) for this table's applicability check instead of the
     shared helper, rather than risk cross-partner draft leakage.
   - **Found another naming mismatch while wiring up real status pills**
     (their first dynamic use — they only existed in the static How-To
     mockup before): `schema.answerStatuses` keys use underscores
     (`yet_to_start`) but the `.status-pill` CSS classes use hyphens
     (`status-yet-to-start`). New `statusPillClass(key)` helper converts
     between them. Verified via Playwright with the one key that actually
     has an underscore — confirmed `status-yet-to-start` applied, not a
     literal (wrong) `status-yet_to_start`.
   - **Tooltip is a plain `title` attribute** (Response/Remarks, omitted
     entirely if both are blank), not a custom hover-card — simplest
     thing that satisfies "show it on hover," confirmed showing the right
     text via Playwright's `getAttribute('title')`.
   - Verified end-to-end: applicability inverts correctly between a
     Camera-only and a Radar-only product (Camera section greys out for
     the radar product and vice versa, confirmed via cell class
     assertions both directions); count-pill resize (2→4→3) preserves
     already-filled slots and pads/truncates the rest; clicking a
     product's column header lands on that exact product's tab on
     Partner Detail; sub-tab/picker selections survive navigating away
     to Partner Detail and back. No console errors. Screenshot confirms
     the collapsed-by-default section cards and the visual distinction
     between an inapplicable cell (grey italic) and an applicable-but-
     unanswered one (muted dash).

## Teammate review batch — DONE, before Step 4 onwards (6 of 6 DONE)

Six fixes/asks from teammates who reviewed the app, gathered in one
sitting before starting the next branch. Not part of the original
Step 1-6 dependency chain (those were about question-numbering/
authoring order specifically), so this batch is inserted ahead of
Step 4 rather than renumbered into that sequence.

**1. Remove partner. DONE.** `DELETE /api/partners/<id>` already existed
server-side; added a `btn-danger` "Remove" button next to "Edit Info" in
the sidebar header, mirroring `data-remove-product`/`data-remove-patent`
exactly. On confirm: `api('DELETE', ...)`, clears `State.detailPartner`,
refreshes the partner list/dropdown, and falls back to the
"select a partner" hint (no forced tab navigation needed — staying on
Partner Detail with nothing selected already reads correctly). Verified
with a disposable test partner via Playwright; `gahan`/`novus` untouched.

**2. SoC picker shown unconditionally. DONE.** Wrapped the SoC chip row
in the same checked-or-has-data condition sensor notes already use
(`socChecked || hasSocSelected`, where the latter checks whether any
`prod.socs[key]` is already true) — shows a muted "(SoC unchecked — kept
because a type is already selected)" note when sticky, exactly mirroring
the sensor-notes wording pattern. Verified via Playwright: hidden on a
fresh product, appears on checking SoC, stays visible (with the sticky
note) after unchecking SoC while a chip is still selected, disappears
once the chip is also deselected.

**3. Product-level notes. DONE.** New `product.notes` field (defaulted
`''` in `newProduct()`), rendered as a textarea at the bottom of
`productCardHtml` with the standard `.print-val` sibling, new
`data-product-notes` branch in `handleDetailChange` (distinct from the
existing per-sensor `data-product-note`, singular). Verified persistence
across a save + reload via Playwright.

**4. Read-only by default, explicit Edit button. DONE.** Largest item in
this batch, as expected — touched nearly every editable element on
Partner Detail.
   - `State.detailEditMode`, defaults `false` on every fresh
     `loadDetailPartner()` call (including the "no partner selected"
     branch, which previously left stale state behind — fixed as part of
     this). A new `#btn-detail-edit` button (next to Print/PDF) toggles
     it; label reads "Edit" or "Done" via `refreshEditButtonLabel()`.
     Clicking "Done" with no pending changes reverts to read-only
     immediately, no Save required. Resets to `false` automatically
     after a successful Save *or* Discard (added one line to each).
     `markDirty()` hides the Edit/Done button entirely while
     dirty — Save/Discard are the only way out of edit mode once
     something's actually changed.
   - Confirmed persists across tab switches within the same partner,
     same as planned.
   - **Forms**: a single `editAttr()` helper (`State.detailEditMode ? ''
     : 'disabled'`) dropped into every select/input/textarea *and*
     button's template across `answerRowHtml`, `draftActionsRowHtml`,
     `sectionGradeRowHtml`, `domainGradingCardHtml`, `productCardHtml`,
     `patentCardHtml`, decision fields, the stage select, the notes
     textarea, the "+ Add Product/Patent/Question/Function" and every
     "Remove"/"✕" button. Browser-enforced — confirmed via a full grep
     sweep that every form element and button in the Partner Detail
     render tree carries it (the Comparison page's own product-picker
     selects are correctly untouched, unrelated state).
   - **Pill-style toggles and the Hard Disqualifiers list** (`<span>`s
     and `<li>`s — can't take `disabled`): a single guard at the top of
     `handleDetailClick` (`if (!State.detailEditMode &&
     el.dataset.statusFilter === undefined) return;` — status filter is
     the one view-only action reachable through that dispatcher) plus a
     matching one-line guard on the Hard Disqualifiers' separately-bound
     click listener. Paired with CSS (`.detail-readonly .toggle-pill,
     .hard-disqualifier-item { pointer-events: none; opacity: .6 }`) so
     read-only mode is visibly, not just silently, non-interactive —
     **explicitly overridden back to full opacity in the print
     stylesheet**, so a PDF exported while the page happens to be in
     read-only mode never looks faded.
   - The existing unsaved-changes guard is unchanged, as planned.
   - Verified extensively via Playwright on a disposable partner: every
     field/button disabled by default; a pill click while read-only is a
     true no-op (no dirty indicator); Edit enables everything and flips
     the label to "Done"; Done-with-no-changes reverts without Save;
     Save and Discard both correctly return to read-only afterward; edit
     mode survives a General → Product tab switch. Screenshots confirm
     the visual states. No console errors across the whole pass.
   - **Follow-up bug report, same day — "+ Add Question isn't working."
     DONE.** Two distinct causes, both real:
     1. A draft defaults to medium priority with no status; if a status
        or priority filter was active, the new draft was created (it's
        really in `State.detailPartner.draftQuestions`) but didn't
        render, since it didn't match the active filter — looked exactly
        like the button silently did nothing. Fixed: drafts (`q.id < 0`)
        are now unconditionally exempt from both filters in
        `answerQuestionsTableHtml` — you're actively authoring them, not
        reviewing existing answers, so a review filter must never hide
        work in progress.
     2. The real culprit, confirmed directly by the user: forgetting to
        click "Edit" first. A disabled button gives zero feedback when
        clicked — no toast, no error, nothing — which is indistinguishable
        from "broken" if you don't already know read-only mode exists
        (a brand-new concept as of item 4 above). Fixed with a hard-to-miss
        amber `.readonly-banner` at the very top of Partner Detail
        whenever `!State.detailEditMode`, with its own inline "click here
        to Edit" button (`#btn-detail-edit-banner`, just calls the
        existing `#btn-detail-edit`'s click rather than duplicating its
        logic) — so the next person who forgets doesn't have to
        rediscover this by filing a bug.
     - Verified via Playwright: a draft now renders immediately
       regardless of which status/priority filter is active; the banner
       shows on every fresh read-only load and disappears the moment
       either Edit button is clicked, and reappears after "Done" with no
       changes. Screenshot confirms the visual. No console errors.

**5. New Function "+", with an auto-created *empty* section. DONE.** A
"+ Add Function" button next to the Functions label in `productCardHtml`
prompts for a name (native `prompt()` — matches no existing "add with a
name" pattern in this app exactly, but fits the weight of a global,
one-way action better than a blank inline stub you'd rename after).
   - `POST /api/schema/functions` derives a key by upper-casing and
     slugifying the name (`"Surround View"` → `SURROUND_VIEW`, rejecting
     duplicates), appends `{key, label}` to `schema.productFunctions`
     *and* a matching `detailSections` entry — category `'product'`,
     label `"{name} Function Detail"`, domain `perception-function`
     (every existing function-scoped section's domain — no UI exists to
     pick a different one, and none was needed), `scope: {type:
     'function', keys: [key]}`. Persisted via the existing
     `save_schema()` from Step 2.
   - **No pre-authored questions** — starts completely empty, as agreed.
   - **Propagates automatically with zero extra code** — confirmed via
     Playwright: published the new function/section from one disposable
     partner, added a draft question to it through the existing Step 2
     flow, then opened a *different*, pre-existing partner/product and
     confirmed the new function pill appears there too, unchecked, with
     zero special-casing needed.
   - Scoped to functions only, per item 6's explicit decision.
   - Test artifact (`QA_TEST_FUNCTION` + its section) manually removed
     from `schema.json` afterward — there's no "remove function" UI
     (intentionally out of scope, same one-way reasoning as Step 2's
     Publish), so cleanup for a real mistake here means hand-editing
     `schema.json`.

**6. Two new static sensors: LiDAR, USS. DONE.** Two new `{key, label}`
entries in `schema.productSensors`, same shape as the existing four — no
dynamic "+", no dedicated sections, per the explicit decision to keep
sensors static for now. Live immediately with no server restart (schema
is read fresh per request); verified on an *existing* product
(`gahan` / Product 1, never otherwise touched) that both new pills
render correctly, default unchecked, and persist correctly when toggled
— confirming no migration is needed for products created before these
existed.

**Step 4 — Split General/Product master categories, add per-product
domain grading, and a Product Grade Radar. DONE.** The original proposal (discarded — see git history of
this file if the old draft text is ever needed) tried to plot products
on the *existing* 6 master domains. Rethinking surfaced the actual root
problem: those 6 domains each mix **general** (company-wide, one truth
per partner) and **product** (varies per product) sections together,
so a single domain grade can't mean one consistent thing — e.g.
`company-background` blends "founding year/headcount" (general) with
"production lifecycle" (product); `perception-function` blends one
general validation-infra section with 18 product sections; `safety-cyber`
is tagged general today even though 20+ of its 26 questions are
explicitly per-function/per-SoC/per-sensor (ASIL per function, secure
boot per SoC, camera spoofing, DMS privacy/consent) and only reads as
"general" because nobody had split it yet. Fix: stop sharing domains
between general and product. Every master category is now purely one
or the other.

   **Final category list — 10 total (was 6 mixed):**

   *General (5) — one grade per partner, numbered `category.question`:*
   | # | Category | Sections |
   |---|---|---|
   | 1 | Company Overview | `gen-company-overview` (history, team, headcount, geography, leadership, roadmap, positioning) minus the 3 questions moving to #3 below |
   | 2 | Tooling & Infra | `gen-validation-test` (renamed — SIL/HIL, sim tooling, data pipelines, CI/CD, test fleet) |
   | 3 | Quality & Process Maturity | NEW section — ASPICE level, IATF 16949, field failure/warranty data, moved out of Company Overview |
   | 4 | Commercial & Engagement Model | NEW section, NEW questions (none existed) — see starter list below |
   | 5 | Patents & Innovation | `partner.patents[]` — unchanged, no `detailQuestions`, stays outside the numbering scheme entirely |

   *Product (5) — graded separately per product, numbered `category.subcategory.question`:*
   | # | Category | Sub-categories (sections) |
   |---|---|---|
   | 1 | Production & Lifecycle | `prod-production-lifecycle` |
   | 2 | Perception & Function Maturity | 7 camera-perception sections + 9 function sections (AEB/ACC/LDW-LKA/LCA/BSD/RCTA/MOIS/DMS/FUNC) + `prod-sw-quality` + `prod-hmi` |
   | 3 | Regulation & Compliance | `prod-compliance`, `prod-emc-env`, `prod-limitations-india` |
   | 4 | Hardware Capability | compute/sw-arch/pipeline/power + 3 camera-hardware sections + radar + fusion + hw-robustness |
   | 5 | Safety & Cyber Security | `gen-funcsafety-cyber` recategorized — **moved wholesale, not split**: ships as one flat product sub-category with no scope (shows on every product tab, same pattern as Hardware Capability's unscoped sections). Splitting the camera-spoofing/DMS-privacy questions into their own sensor/function-scoped sub-sections is an explicit later refinement, not part of this pass — decided to ship the simple version first. |

   **Numbering rule change:** `questionLabel()` ([app.js:1294](static/app.js#L1294))
   needs a branch on `section.category`: `general` → emit just
   `${categoryNum}.${questionNum}` (2 levels, since every general
   category is exactly one section — no sub-category layer exists or is
   needed); `product` → keep the existing 3-level
   `${domainNum}.${sectionNum}.${questionNum}` logic completely
   unchanged, since product categories genuinely have multiple
   sub-sections.

   **Schema changes needed (`schema.json`):**
   - Add `category: 'general' | 'product'` to every entry in `domains[]`
     — lets `comparisonGroups()` and the new product-radar equivalent
     each filter to the right 5, and lets the partner-level vs
     per-product grading cards each show only their own 5 categories.
   - Split `company-background` into a general domain (Company Overview)
     and a product domain (Production & Lifecycle); split
     `perception-function` into a general domain (Tooling & Infra) and a
     product domain (Perception & Function Maturity). `regulation-
     compliance` and `hardware-capability` stay as-is, just tagged
     `category: 'product'`.
   - Move 3 questions (ASPICE, IATF 16949, field failure/warranty) from
     `gen-company-overview` into a new `gen-quality-process` section
     under the new Quality & Process Maturity domain — re-pointing
     `sectionId` only, ids/answers untouched, so no partner data breaks.
   - Recategorize `gen-funcsafety-cyber`: `category: 'general'` →
     `'product'`, domain moves from `safety-cyber` (general) to a
     product-tagged `safety-cyber` domain, `scope` stays unset (always
     shown).
   - New `gen-commercial-engagement` section + domain, seeded with
     starter questions (none existed before):
     1. "What is your pricing/licensing model — per-unit royalty,
        one-time license fee, NRE + royalty, or a hybrid?"
     2. "Who retains IP ownership of the delivered software/hardware —
        full transfer, license-only, or source-code escrow?"
     3. "What is your support & maintenance commitment post-SOP — SLA
        terms, bug-fix turnaround, and version support lifecycle?"
     4. "Do you offer multi-source rights, or is the engagement
        exclusive? Are there minimum volume commitments?"
     5. "What dedicated engineering support do you provide during
        integration and SOP ramp-up?"
     6. "What are your standard warranty terms and liability caps for
        field issues?"
     **Live in `schema.json` now (qIds 253-258)** — shipped with this
     draft wording rather than blocking the rest of Step 4 on sign-off.
     No in-app "edit question text" UI exists, so if the wording needs
     changing, it's a direct hand-edit of `schema.json` (plain JSON,
     not a destructive operation — no answers reference these qIds yet).

   **Per-product domain grading (new data + new UI):**
   - New `product.domainGrades` array, same shape as
     `partner.domainGrades` (`{domainId, grade, justification}`,
     NA/Developing/Good/Outstanding), scoped to just the 5 product
     domains. Starts blank for every product, new and existing alike —
     manual judgment only, no auto-computation from `sectionGrades`,
     consistent with why `partner.domainGrades` already works this way.
   - Lives as an **inline grading card at the top of each Product tab**
     (Product 1, Product 2, ...) — same control style as the existing
     partner-level Master Category Grading sidebar card, just scoped to
     that one product and placed inline rather than in the sidebar.
   - **Old data cleanup, explicit:** delete every existing
     `partner.domainGrades` entry for `gahan` and `novus` — all 5
     current entries (`company-background`, `perception-function`,
     `regulation-compliance`, `hardware-capability`, `safety-cyber`),
     not just the 3 user confirmed directly. Applying it uniformly
     because the other 2 (`company-background`, `perception-function`)
     *split* rather than move wholesale — their general remnant
     (Company Overview / Tooling & Infra) is narrower than what the old
     grade actually judged, so carrying the old value forward would
     silently misrepresent it. Both partners re-grade all 5 general
     categories from scratch; harmless since grading is a quick manual
     step, not data entry.

   **Comparison page implication (existing partner heatmap/radar):**
   `comparisonGroups()` ([app.js:56](static/app.js#L56)) currently
   returns every domain with `sectionIds.length > 0`, mixing general and
   product. Once domains carry `category`, it needs to filter to
   `category === 'general'` only — the existing partner-level
   heatmap+radar should compare the 5 general categories, since
   `partner.domainGrades` is now purely general-level. Patents &
   Innovation's existing separate-rollup gap (item 1 under "Other open
   items" below) is unaffected by this change.

   **New Product Grade Radar:** second radar on the Comparison page,
   5 axes = the 5 product categories, sourced from `product.domainGrades`
   instead of `partner.domainGrades`. Reuses Step 3's 2-4
   product-picker pattern and `{Partner} — {Product}` labeling (names
   alone are ambiguous across partners). Exact placement on the page
   (alongside the existing radar vs. its own sub-tab) not yet decided —
   revisit once the per-product grading card exists and there's real
   data to plot.

   **Editable question priority (added requirement).** Today `priority`
   can only be set at draft-creation time
   (`draftActionsRowHtml()`, [app.js:1184](static/app.js#L1184)) — once
   a question is published, or for the pre-authored default questions
   that were never drafts at all, there's no UI to change it; it only
   ever renders as a read-only colored edge indicator
   (`data-priority`). Every question's priority should be editable, not
   just drafts'. Since `priority` lives in `schema.json` per question,
   not per-partner, this is a schema-level change affecting every
   partner at once — same category as the existing
   publish/remove-question/add-function flows. Needs: a new endpoint
   (`PUT /api/schema/questions/<id>`) to persist a priority change to
   `schema.json`; a priority-edit control next to each question row
   (reuse the same 3-option select already used for drafts), gated
   behind edit mode like every other control. No partner-data migration
   needed — the row's colored edge already reads `q.priority` live from
   schema on every render, so a change is reflected immediately with no
   answers/data affected.

   **Implementation notes:**
   - Section ids were deliberately kept unchanged throughout (only each
     section's `domain`/`category` field moved) — `sectionGrades` and
     `draftQuestions` reference sections by id, so nothing existing
     broke. `gen-company-overview`, `gen-validation-test`, and
     `gen-funcsafety-cyber` all kept their original ids; only
     `prod-production-lifecycle`'s `domain` field repointed to the new
     `production-lifecycle` domain, and `gen-validation-test`'s `domain`
     repointed to the new `tooling-infra` domain.
   - `questionLabel()` ([app.js:1294](static/app.js#L1294)) now branches
     on `section.category`; `comparisonGroups()`
     ([app.js:56](static/app.js#L56)) filters to general domains and a
     new `productComparisonGroups()` mirrors it for product domains.
   - `domainGradingCardHtml()` (partner-level sidebar card) now filters
     to general domains only; a new `productDomainGradingCardHtml()`
     renders the per-product equivalent inline at the top of each
     Product tab, backed by new `product.domainGrades` +
     `ensureProductDomainGrade()`/`getProductDomainGrade()`.
   - New `renderProductGradeRadar()` lives on the Comparison page's
     existing "Products" sub-tab, deliberately reusing the same 2-4
     product picker as the Product Comparison table (one picker drives
     both the table and the radar) rather than adding a second picker.
   - Priority edits commit straight to the server
     (`saveQuestionPriority()`) instead of going through the partner's
     own Save button, since priority is schema-level and shared by
     every partner — same reasoning as the existing add-function flow.
   - Verified end-to-end via Playwright with a disposable test partner:
     5 general + 5 product domain groupings render correctly (Patents &
     Innovation still correctly excluded from both the heatmap and
     either radar — it has zero sections, a pre-existing gap, item 1
     under "Other open items," untouched by this step); 2-level vs.
     3-level numbering confirmed (`1.1` vs. `1.1.1`); Safety & Cyber
     Security questions render under the Product tab's domain grouping;
     a product domain grade of "Good" round-tripped correctly onto the
     Product Grade Radar's matching axis; a published question's
     priority change persisted via the new endpoint and updated its
     row's color immediately; zero console errors throughout.
   - `gahan`'s 4 stale `domainGrades` entries (`company-background`,
     `perception-function`, `regulation-compliance`,
     `hardware-capability`) were removed; its `patents-innovation` entry
     was kept since that domain is unaffected by the split.

**Step 5 — Customer-facing Excel export/import. DONE (5.1-5.10).**
Different problem from the partner-to-partner JSON
idea under "Further ideas" below — that one assumes both sides have
the tool; here the company being evaluated doesn't have it at all, so
data has to leave the tool, get filled in externally, and come back.
Moved ahead of the "How To" tab (now Step 6) so How To can document
this feature too once it ships, instead of missing it. **Single-machine
hosting assumption** — this app runs on one local machine, not a
multi-server/multi-tenant deployment, so the design below deliberately
skips distributed-systems concerns (auth, encryption-in-transit,
multi-server locking). It does *not* skip same-machine concurrency
(browser tab vs. disk) — that risk is real regardless of hosting.

   Numbered 5.1-5.10 for reference, **in build order** — sequenced by
   dependency so nothing gets built twice: decisions that shape the
   file format come before the code that has to match that format;
   foundational data fields (version/timestamp/log) come before the
   endpoints that read or write them; export comes before import
   (import has to parse what export produces); both endpoints exist
   before the UI that calls them; verification is last.

   **5.1 — Resolve the 3 open design decisions. DONE.**
   1. **Status is customer-facing.** Exported as a second editable
      column, via a locked dropdown sourced from `answerStatuses` —
      same reasoning as the existing in-app status select, just on the
      customer's side now.
   2. **Per-product sections are scope-filtered at export time** —
      mirrors exactly what's already visible on that product's own tab
      today (`sectionScopeMatches(section, product)`, plus the existing
      "sticky" rule that keeps a section if it already has saved answer
      data even though its sensor/function got unchecked since). No
      chicken-and-egg: the evaluator has already set up the product's
      sensors/functions in-app before ever exporting for it, so there's
      nothing to pre-guess.
   3. **One combined multi-sheet workbook per export call** — a
      "General" sheet plus one sheet per product, all in a single
      `.xlsx`, mirroring the in-app General/Product-N tab structure.
      Single endpoint, no `scope=` param. This reopens the cross-sheet
      identity risk flagged earlier (same `qId` can legitimately appear
      on two different product sheets if both products share a
      checked sensor) — handled by stamping **every sheet** with its
      own hidden `productId` (`null` for the General sheet), so import
      matches by `(qId, sheet's productId)` for product rows, not `qId`
      alone.

   **5.2 — Schema version stamp.** `schema.json` gets a `schemaVersion`
   integer, bumped by `save_schema()` on every write. Lets import
   detect "the schema changed since this file was generated" with a
   plain `!=` check — a monotonic counter, not a random key, because
   the question that matters is *ordering* ("is this older than
   current"), which a random id can't answer. Small, independent,
   needed by 5.5 and 5.6.

   **5.3 — Partner concurrency guard.** Every partner gets a
   `lastModified` ISO timestamp, set by `api_update_partner`
   (`PUT /api/partners/<id>`) on every save — touches the *existing*
   save path, not new to import, since the concurrency risk it fixes
   (stale browser tab) applies to normal editing too, import in 5.7
   just makes it much more likely to actually happen. `saveDetail()`
   sends the `lastModified` it loaded with; server rejects with 409 if
   it doesn't match current (changed by an import, or another tab,
   since this one loaded). Client shows "this partner changed since
   you loaded it — reload before saving" rather than silently
   overwriting. Independent of the Excel mechanics — could be built
   any time before 5.7, placed here since it's foundational.

   **5.4 — Export log scaffold.** New append-only local file,
   `data/questionnaire_exports.json`: one entry per export —
   `{exportId, partnerId, schemaVersion, exportedAt, sheets: [{productId
   (null for General), qIds: [...]}]}` — one entry per whole-workbook
   export, with a per-sheet `qIds` breakdown so the "blank on purpose
   vs. didn't exist yet" question can still be answered per product.
   `exportId` is a UUID (this is where a random key earns its keep —
   uniquely naming *which* export instance a returned file is, for
   traceability/debugging, not for drift detection). Small read/write
   helper pair, mirrors `load_schema`/`save_schema`. Needed by 5.5.

   **5.5 — Export endpoint.** `GET /api/partners/<id>/export-questionnaire`
   — no `scope=` param, always builds the full combined workbook (5.1.3).
   Real `.xlsx` via `openpyxl` (new dependency — changes the "flask
   alone is enough" fact from earlier in this project). One sheet named
   "General", plus one sheet per product (named after the product).
   Each product sheet only includes scope-applicable sections (5.1.2).
   Visible columns per sheet: dotted number, question text, Partner
   Response (editable), Status (editable via locked dropdown sourced
   from `answerStatuses`). Hidden per row: `qId` (locked). Hidden per
   *sheet*: that sheet's own `productId` (`null` on General) — not just
   one partner-wide stamp, since multiple product sheets exist in the
   same file. Shared across the whole workbook: `partnerId`,
   `schemaVersion`, `exportId`. Sheet protection locks everything except
   the editable columns and explicitly disables row insert/delete (not
   just cell editing — protection options default to allowing inserts
   in some Excel versions). Appends one entry (with its per-sheet
   breakdown) to the 5.4 log. Depends on 5.1, 5.2 (version to stamp),
   5.4 (log to write).

   **5.6 — Import preview endpoint.**
   `POST /api/partners/<id>/import-questionnaire/preview` (file
   upload) — parse every sheet in the workbook; validate the file's
   `partnerId` matches the partner being imported into (reject outright
   if not — wrong-target case); for each sheet, validate its
   `productId` still refers to a real product on this partner (if that
   product was deleted in the meantime, skip just that sheet, flagged,
   not the whole import); compare `schemaVersion` (warn, don't block,
   if it differs); re-derive each row's expected `qId`/text from the
   *current* schema and flag any row that doesn't match (covers both
   "structure was tampered with" and "this question's wording changed
   since export"); trim whitespace before treating a cell as non-empty.
   Matches product rows by `(qId, that sheet's productId)`, never `qId`
   alone, since the same `qId` can legitimately appear on more than one
   product's sheet. Returns a diff: N answers to update per
   sheet/product, plus a list of flagged/skipped rows and why. Same
   two-step shape as the existing remove-question flow (usage-check,
   then delete). Depends on 5.5 (must parse exactly what it produces),
   5.2.

   **5.7 — Import commit endpoint.**
   `POST /api/partners/<id>/import-questionnaire/commit` — only fires
   on explicit confirmation of the 5.6 preview; writes only the
   non-blank, validated cells (PATCH semantics — never blanks an
   existing answer just because a returned cell is empty, so multiple
   partial files for the same partner layer instead of clobbering each
   other); bumps `lastModified` per 5.3 on write. Depends on 5.6, 5.3.

   **5.8 — Export UI.** One "Export Questionnaire" button on Partner
   Detail (not per-tab, since 5.5 is a single combined-workbook call)
   that hits 5.5 and downloads the file. Depends on 5.5 existing.

   **5.9 — Import UI.** File picker + a preview/diff display (the 5.6
   response) + an explicit confirm button that calls 5.7 + error
   states for rejected/flagged files. Depends on 5.6, 5.7.

   **5.10 — End-to-end verification.** Every row below is a concrete
   test against the finished 5.1-5.9, not just a design note:

   | Problem | Approach (built in) | Test criteria |
   |---|---|---|
   | Wrong partner targeted | File-level hidden `partnerId` (5.5), validated on import (5.6) | Export Partner A's workbook, attempt import into Partner B → rejected with a clear error, zero rows written, verified via API that B's answers are untouched |
   | Same `qId` on two different product sheets gets mixed up | Every sheet stamps its own hidden `productId` (5.5); import matches by `(qId, sheet's productId)`, never `qId` alone (5.6) | Two products both have Camera checked, both sheets contain the same camera-perception `qId`; fill different answers on each sheet, import → each product ends up with *its own* answer, not the other's |
   | A product was deleted between export and import | 5.6 validates each sheet's `productId` still refers to a real product; if not, skip just that sheet, flagged | Export, delete Product 2 in-app, import the file back → Product 2's sheet is flagged/skipped, General + remaining product sheets still import normally |
   | Schema changed since export (questions added/removed/reworded, status taxonomy changed) | `schemaVersion` (5.2) compared in 5.6; mismatch → warning in the preview, not a hard block | Export, bump `schemaVersion` (add a question), re-import same file → preview shows the version-mismatch warning; the 2 new questions show as "not in this file," not as errors |
   | Sheet protection removed/bypassed | Re-derive expected `qId`/text per row from current schema in 5.6; never trust the locked column alone | Manually unprotect the test file, edit a locked question-text cell to something else, import → that row is flagged/skipped, not silently accepted |
   | Need to trace which export a returned file came from | `exportId` (5.4) stamped in the file + logged with its per-sheet `qIds` breakdown | Export, check the log has a new entry with the right per-sheet `qIds`; reused visibly in a later debugging session without needing to re-derive it |
   | Drag-fill / autofill overwrites cells; whitespace-only cells read as "answered" | Trim before the non-empty check (5.6); preview-diff (5.6/5.9) catches an implausible bulk change before commit | Fill a column with drag-fill in the test file, import → preview clearly shows N rows changing at once, confirming is a deliberate second step, not automatic |
   | Stale browser tab overwrites a fresh import | `lastModified` optimistic-concurrency check (5.3) on `PUT /api/partners/<id>` | Open a partner's Detail page, import a file for it (server-side, 5.7), then click Save on the still-open tab → 409, not a silent overwrite; reload picks up the imported data intact |
   | Multiple people return separate partially-filled files | Import is a PATCH (5.7, only non-blank cells), applied per-file, never a full replace | Import file 1 (answers questions 1-30), then file 2 (answers 31-60, blanks elsewhere) → final state has all 60 answered, file 2 didn't blank out 1-30 |
   | Corrupted/unreadable file | 5.6 parses fully before writing anything; rejects the whole import atomically on any parse failure | Feed a truncated/non-xlsx file to the import endpoint → clean 4xx error, `data/partners.json` byte-for-byte unchanged |
   | Drafts shouldn't be exportable | 5.5 only ever reads `questionsForSection` (schema-only), never `questionsForSectionAll` (which also pulls drafts) | Add a draft question, export → draft does not appear in the file (already true of every other schema-only render path, just needs the same exclusion here) |
   | Can't tell "left blank on purpose" vs. "didn't exist in their copy" | The 5.4 log's `qIds` list answers this retroactively — diff the log entry's `qIds` against current schema to see what's new since that file went out | Export (qIds 1-60 logged), add qId 61-62, re-import same file, then check: log shows file only ever covered 1-60, so 61-62 being blank is explained, not ambiguous |

   **Implementation notes:**
   - Export/import logic (`scope_field`, `section_scope_matches`,
     `section_has_answer_data`, `question_label`,
     `ordered_questions_for_sections`) are direct Python ports of the
     equivalent `app.js` functions, since the export must agree exactly
     with what the in-app Product tab already shows for that product.
     Caught a real bug while testing: `detailSections` is no longer
     contiguous-by-domain in the array (Step 4 reassigned `domain`/
     `category` per-section without reordering the array itself), so a
     flat scan of section order put domain `5.x` rows before `4.x` and
     `1.x` rows. Fixed by explicitly grouping by `schema.domains` array
     order first, same as `domainGroupedSectionsHtml` already does in
     the UI — verified the fix against a real export (numbers now
     ascend `1.1` → `4.6` on General, `1.1.1` → `5.1.26` per product).
   - Workbook layout: one sheet per scope (`General` + one per
     product), columns `#` / Question / Partner Response / Status
     visible, `qId` hidden (column E), sheet identity (`partnerId`,
     `productId`, `schemaVersion`, `exportId`) in hidden fixed cells
     G1:H4 rather than a per-row repeat, since identity is the same for
     every row on a given sheet.
   - Import is two real endpoints, not one: `/preview` parses and
     validates but writes nothing; `/commit` only ever applies the
     exact `changes` array the client already got back from `/preview`
     and the user confirmed — it never re-parses a file, so a file
     swapped between the two calls can't sneak in unreviewed changes.
   - All 11 rows of the 5.10 table were verified directly against the
     running server (not just unit-style): wrong-partner reject, same
     `qId` on two product sheets resolving to two independent answers,
     a deleted product's sheet being skipped while the rest of the same
     file still imports, a `schemaVersion` bump producing a non-blocking
     warning, a hand-edited question-text cell being flagged and
     excluded, a whitespace-only cell correctly not counting as an
     answer, a stale `lastModified` producing a real 409 with the
     newer data intact, two sequential partial imports both landing
     without either blanking the other (PATCH semantics), a corrupted
     file being rejected with `data/partners.json` byte-for-byte
     unchanged, and a draft question never appearing in an export.
     Finished with a Playwright pass through the actual UI (download
     link, empty-file preview, filled-file preview showing the version
     warning and the skipped-sheet flag, confirm-to-commit closing the
     modal) — zero console errors throughout.
   - `requirements.txt` now includes `openpyxl>=3.1,<4` — the "flask
     alone is enough" fact from earlier in this project no longer holds.
   - All test partners/questions/log entries created during
     verification were removed afterward; real partner data
     (`gahan`/`novus`/`netadyne`) was only ever read during testing, not
     written to to until intentional verification suite, then untouched.
   - **Real bug found post-verification, on a genuine filled-in `novus`
     export**: typing a bare number into Partner Response (e.g. a
     founding year) makes Excel store that cell as an `int`, not a
     string — `row[2].value.strip()` then crashed with `AttributeError`.
     My synthetic test data never happened to use a numeric answer, so
     5.10's verification pass missed this. Fixed with a `cell_str()`
     coercion helper used on every cell read, plus a global
     `@app.errorhandler(Exception)` so *any* future unhandled exception
     returns clean JSON instead of Flask's default HTML error page —
     the client's `res.json()` was choking on `<!doctype html>...`
     with a confusing "Unexpected token '<'" instead of a real error
     message. Re-verified against a reproduction file with numeric
     answers; also confirmed a genuine 404 now returns JSON.

   **Manual test plan — to execute later, evaluate correctness and
   performance.** Everything above was verified once during build
   (mostly via direct API calls + one Playwright UI pass, plus two real
   bugs the user found by hand: numeric cells, invisible Discard
   button). This list is for a deeper second pass — real Excel, real
   file transfer, real usage patterns — not a repeat of the same
   checks. Two categories: how an ordinary evaluator would actually use
   this without thinking about edge cases, and the deeper system-level
   cases a technical review would look for.

   **Executed 2026-06-24** (everything an API/script/Playwright could
   drive). Used disposable `STEP5_QA*` partners, all removed afterward;
   `gahan`/`novus`/`netadyne` untouched except read-only checks.

   *A. Everyday usage (layman's pass — no malice, no edge-case
   awareness, just using the feature naturally):*
   - [ ] **Needs you, not automatable**: open a real export in **Desktop
     Excel** — confirm it looks like a normal sheet, the Status
     dropdown actually renders as a dropdown, nothing's cut off.
   - [ ] **Needs you**: fill some answers, save, close Excel, reopen the
     next day, fill more, save again — confirm the close/reopen cycle
     doesn't disturb the hidden metadata or protection.
   - [ ] **Needs you**: a real email round-trip (attach, send, download,
     then import) — I can't send/receive real email from here.
   - [ ] **Needs you — flagged as the most likely real risk spot**: fill
     the file in **Google Sheets** instead of Excel, re-download as
     `.xlsx`, then import. Google Sheets doesn't always preserve
     Excel-specific sheet protection/data-validation faithfully on
     re-export — this is the one item most worth actually doing by hand.
   - [x] Leave the file untouched, import → `{"changes": [], "flagged":
     []}`. Clean "nothing to import," not an error. **Pass.**
   - [x] Import the exact same filled file twice → second import
     re-applied the same value, no duplication (`generalAnswers` still
     has exactly one entry for that `qId`). **Pass.**
   - [x] `.xls`, `.csv`, and a totally unrelated real `.xlsx` (no
     exported metadata at all) — first two correctly rejected
     ("Could not read this file"), but **the unrelated `.xlsx` was
     silently accepted as "0 changes, nothing to import"** — looked
     identical to a customer who genuinely left everything blank, which
     is misleading (you'd think the import worked; really you uploaded
     the wrong file). **Bug found and fixed**: reject outright now if
     *no* sheet in the file has a `partnerId` at all, distinct from "has
     one but it doesn't match" — `server.py`'s
     `api_import_questionnaire_preview`. Re-verified: now returns
     "This doesn't look like a questionnaire exported from this tool."
   - [x] Free text in the Status cell ("maybe in progress??") — Partner
     Response still applied, status flagged and ignored, exactly as
     designed. **Pass.**
   - [x] A 4400-character answer (trimmed to 4399 after stripping a
     trailing space — correct) and a second answer mixing accents,
     Chinese, emoji, and Arabic RTL text — both round-tripped through
     export → fill → import → commit → storage byte-for-byte correctly.
     **Pass.**
   - [x] Stale-tab message, mechanism confirmed: editing the same
     partner from a second "tab" (simulated via a second PUT) then
     saving the first produces `409 {"error": "This partner changed
     since you loaded it. Reload before saving."}` — the toast shown to
     the user adds "(e.g. a questionnaire import)". Wording itself is a
     judgment call for you, not something I can pass/fail.
   - [ ] **Needs you**: whether double-clicking Export and getting a
     browser-suffixed second file is obvious enough — pure browser
     download-manager behavior, nothing server-side to test.

   *B. System-level (deeper than the original 5.10 pass):*
   - [x] Sheet renamed by "customer" (`QA Product One` → `Camera Module
     (renamed by customer)`) — matched correctly by hidden `productId`
     regardless of the new tab name. **Pass.**
   - [x] Sheet deleted entirely instead of left blank — behaved exactly
     like nothing being filled in, no error. **Pass.**
   - [x] Two products with the identical name `"QA Product One"` —
     openpyxl auto-renamed the second sheet to `QA Product One1` on
     export (no crash, no collision). Filled both sheets with different
     answers and re-imported: each correctly resolved to its own
     `productId` (`qaP1` vs `qaP3`) despite the confusing-looking shared
     name. **Pass, with a minor cosmetic note**: the auto-suffixed sheet
     name could look odd to a real customer if two products are
     genuinely named the same — not a data risk, just a naming wrinkle,
     not fixed (no action needed unless it comes up in practice).
   - [x] All products deleted, then re-imported the original
     multi-product file — all 3 product sheets flagged
     `"skippedWholeSheet": true`, General still processed. **Pass.**
   - [x] Brand-new partner, zero products, zero answers — exports a
     General-only workbook, imports cleanly with 0 changes. **Pass.**
   - [x] Bumped a real question's priority (`high`) between export and
     import — zero effect on the import diff, confirming priority isn't
     part of answer-matching. Reverted back to its committed value
     (`medium`) afterward since that was a test edit, not a real change.
     **Pass.**
   - [x] Fired two `/commit` calls in parallel (background shell jobs,
     near-simultaneous) targeting different `qId`s — both landed, no
     lost update, confirming the Flask dev server's default
     single-threaded request handling (`threaded=True` was never passed
     to `app.run()`) serializes these safely. **Pass.**
   - [x] Scale check: 10 products, every sensor/function checked
     (worst-case section coverage) → 11 sheets, 2202 total data rows,
     176 KB file. **Export: 2.27s. Import preview (unfilled): 0.91s.
     Import preview (all 2202 rows filled): 1.09s. Commit (2202
     answers): 0.35s.** All comfortably fast for local single-user use;
     no slowdown found worth optimizing yet.
   - [x] `questionnaire_exports.json` after this test session's 10
     exports: 86 KB, ~5,200 logged `qId` references. Confirms it's an
     unbounded append-only log as expected — fine for normal usage
     (occasional real exports), would only matter after a very large
     number of exports. No rotation/pruning added; not needed yet.

**Step 6 — "How To" tab.** A how-to-use page should document the
*finished* feature set — building it earlier would mean rewriting it
after every step above ships (numbering, question authoring/publish,
Product Comparison, the general/product category split, customer
export/import). First pass (4 cards of prose + a legend table + one
small box diagram) was rejected anyway: too much text, nobody will
actually read it. Explicit correction: **this page has to be a full
visual representation, minimal text, self-explanatory at a glance** —
not a written explainer with a diagram bolted on, the diagram/visual
*is* the explanation. The current `#page-howto` markup, the
`.howto-*` CSS, and the `How To` nav tab are still in the codebase but
should be treated as a rough draft to replace, not a finished feature.
Re-design needed before touching code again — open questions for next
session: a single big infographic-style flow (icons/color instead of
paragraphs) vs. a short interactive click-through; how much of the
status/grade taxonomies can be conveyed as color/icon legends alone vs.
needing any words at all; whether this should stay a static page or
become something users step through once. The
`.status-pill`/`.status-na`-family CSS classes added alongside the
first attempt are still worth keeping regardless of how this page gets
redesigned — they're reusable status badges, not specific to this
page's layout. **Now follows Step 5** (customer export/import, swapped
order) so it can document Steps 1-5 + the teammate review batch at the
point it's built; it still won't yet reflect Step 7 (refreshed
exports), so a follow-up touch-up once that ships is expected, not a
flaw in building this now.

**Step 7 — Redefine CSV/PDF export to match the current design.**
Stays last in the sequence — exports should reflect the *truly*
finished data model, including Step 4's per-product domain grades and
whatever Step 5's customer-import flow adds, not get audited
now and re-audited again after each step above lands. Both
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

## Further ideas (not scheduled — just notes for later)

1. **Import/export of full partner details.** Discussed, not designed,
   not in the step sequence — revisit some time after Step 4. The
   partner-JSON side is nearly free (each partner object is already
   self-contained, and `server.py`'s `PUT`/`POST` already do
   passthrough writes with no schema validation, so most of the
   plumbing exists). The real loophole is **schema drift**: every
   partner references `schema.json` by id/key — `qId`, `sectionId`,
   `domainId`, and sensor/function key strings — and this app lets each
   install's schema drift independently (publish-question picks
   `qId = max+1` per install, "+ Add Function" derives keys from
   whatever label a user types locally, Step 4 is about to restructure
   section/domain ids again). Importing a partner exported from one
   install into another with a different schema either silently
   orphans an answer (qId doesn't exist target-side) or silently
   misattributes it (qId exists but means something else) — no schema
   version stamp exists today to even detect the mismatch. Before
   building this, need to decide: (a) bundle the relevant schema slice
   with the export and diff it against the target on import, or (b)
   treat one canonical, git-synced `schema.json` as the source of truth
   across installs and local schema edits as the exception. Whichever
   is chosen changes the shape of the feature.

   Related but distinct from **Step 5** (customer-facing Excel
   export/import, in the main sequence above): that one round-trips a
   single install's *own* schema out to a non-tool-user and back, so it
   mostly sidesteps this cross-install drift problem — the only drift
   risk there is the schema changing between one install's own export
   and its own later import, not two installs diverging independently.
