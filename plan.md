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

## Code touch points (for implementation, not yet done)

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

Plan reviewed and approved. Ready for implementation.

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

## Schema/data model change already agreed (not yet implemented)

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

## Next steps

1. Hero-tag toggle UI and Patents-in-heatmap UI are still explicitly
   deferred per the user — no UI exists yet for marking a product's
   hero sensors/functions, or for showing Patents & Innovation as a
   heatmap column. Revisit once there's a concrete view in mind.
2. Possible follow-up: revisit whether some of the very small sections
   (Power: 2 questions, LDW/LKA: 1 question, Pipeline Architecture: 2
   questions) should be merged into a neighboring section for less tab
   clutter — low priority, easy to change later.
3. Noted but not actioned: user feels the pre-refactor master-branch UX
   was more visually polished/appealing than the current rebuild. A
   general UI-polish pass is a separate, not-yet-scoped task.
