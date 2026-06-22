# ADAS Partner Evaluation Dashboard

Local Flask app for L&T's ADAS team to evaluate and track ADAS technology partners
(sensors, perception stacks, software providers) through a structured scoring
rubric, plus free-form notes and a per-partner product catalog.

## Running it

First time on a machine, install dependencies:

```
installation.bat
```

Checks for Python (warns if older than 3.10, errors if missing entirely)
and installs everything from `requirements.txt` — currently just Flask,
which pulls in its own sub-dependencies (Werkzeug, Jinja2, etc.)
automatically.

Then, every time you want to run it:

```
start.bat
```

(or `python server.py` directly, e.g. on macOS/Linux). Opens
`http://localhost:5000` automatically. Data is stored in
`data/partners.json` (no database). `schema.json` defines the rubric
(sections, questions, weights, dropdown options) — edit it to change the
evaluation form without touching code.

There's no hot-reload; restart `server.py` after backend changes. The
frontend (`static/`) is plain JS/CSS, so browser refresh is enough for
frontend-only edits — but watch for **stale CSS in the browser cache**
when debugging print/PDF output (hard-refresh or use a fresh headless
browser context, not just re-fetching).

## Architecture

- **`server.py`** — Flask app. Thin REST API over a single JSON file
  (`data/partners.json`), atomic writes via temp-file + `shutil.move`.
  No auth, no DB — intentional, this is an internal single-user tool.
  Routes: `GET/POST /api/partners`, `GET/PUT/DELETE /api/partners/<id>`,
  `GET /api/schema`, `GET /api/export/csv`.
- **`schema.json`** — the rubric definition: `techSections`/`techQuestions`
  (weighted scoring), `perceptionSections` (qualitative Q&A), plus
  `businessModels`, `productSensors`, `productFunctions` for the
  classification/product features. Treated as the source of truth for
  dropdown options and form structure — the frontend renders from it
  rather than hardcoding question lists.
- **`static/app.js`** — single-page vanilla JS, no framework, no router
  (no URL/hash state — navigation is pure JS state + DOM re-render).
  Key pattern: dynamic fields/buttons use `data-*` attributes read by two
  generic event-delegation dispatchers —
  `content.addEventListener('change'/'input', handleDetailChange)` and
  `content.addEventListener('click', handleDetailClick)` — registered
  once on a stable container. This means newly injected DOM (e.g. after
  `refreshProductsTab()`) is automatically wired up; **don't add
  per-element listeners**, add a new `data-*` branch to the relevant
  dispatcher instead.
- **`static/style.css`** — includes a `@media print` block that drives
  both the in-browser print dialog and PDF export (there's no separate
  PDF renderer — "print to PDF" in the browser *is* the PDF feature).

## The "print-val" pattern (important when adding editable fields)

Every multi-line editable field (textarea) has a sibling
`<span>`/`<div class="print-val">` mirroring its value. CSS hides the
live `textarea`/`select` and shows `.print-val` only under `@media print`,
because textareas don't expand/scroll on a printed page and would
truncate long text.

**Rule when adding a new editable field:** if it's a `select`,
`.q-score-select`, `.q-remarks-input`, `.p-response-area`,
`.p-judgement-select/.label`, or `.form-textarea`, it's already covered
by the blanket print-hide rule in `style.css` (`@media print` block) —
just make sure you also render a `.print-val` sibling with the synced
text, or the value will disappear in print instead of duplicating.
Forgetting the print-hide rule (not the print-val) is what caused the
"shows twice in PDF" bug fixed in 2026-06.

## Company-level Portfolio is derived, not stored

Sensor/function coverage per company (`computePortfolio()` in `app.js`)
is computed on the fly from that company's `products[]` array — it is
**not** a separately stored/edited field. This was a deliberate choice
to avoid dual-maintenance of the same fact (decided when the
Products/Portfolio feature was added). If asked to make portfolio
independently editable, that's a deviation from this design — confirm
with the user first.

## Print/PDF layout gotcha

`.detail-layout` is the sidebar+main grid for the partner detail view.
Under `@media print` it is forced to `display: block` (not the screen
grid) so the sidebar stacks above the main content — using a fixed grid
column in print wastes ~30% of every page once the sidebar's own
content runs out partway through the document (fixed 2026-06).

## Verifying print/PDF output without manual clicking

There's no `chromium-cli` in this environment. To audit real print
output programmatically:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)  # reuses system Chrome, no extra download
    page = browser.new_page()
    page.goto("http://localhost:5000")
    page.click(".partner-card")          # no router — must click into detail view
    page.wait_for_selector(".detail-layout")
    page.pdf(path="./out.pdf", print_background=True, format="A4")
```

Then rasterize pages for visual inspection with PyMuPDF (`pip install
pymupdf`) since the `Read` tool's PDF support needs `pdftoppm`, which
isn't available here:

```python
import fitz
doc = fitz.open("out.pdf")
for i, pg in enumerate(doc):
    pg.get_pixmap(dpi=150).save(f"page_{i+1:02d}.png")
```

Delete scratch PDFs/PNGs and the generator script when done — they're
not part of the app.

## Known footguns

- Don't run two `python server.py` instances at once — both bind
  `0.0.0.0:5000`, and you'll get inconsistent responses depending on
  which process handles each request (one may be running stale code).
  Check `netstat -ano | grep ":5000"` before starting a new one.
- `data/partners.json` is real evaluation data, not fixtures — don't
  leave test/sample products or remarks in it after manual testing.
