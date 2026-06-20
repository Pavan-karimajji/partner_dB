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
