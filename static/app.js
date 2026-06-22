'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   L&T EPS — ADAS Partner Evaluation Dashboard
   Vanilla JS, no build step required.
   ──────────────────────────────────────────────────────────────────────── */

// ── Auto-growing textareas ────────────────────────────────────────────────
// Remarks/notes textareas grow to fit their content instead of clipping it
// behind an internal scrollbar — so the full text is always visible at once.
function autoGrowTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function autoGrowAll(root) {
  root.querySelectorAll('textarea').forEach(autoGrowTextarea);
}

// ── State ──────────────────────────────────────────────────────────────────
const State = {
  schema: null,
  partnersSummary: [],   // lightweight list (from GET /api/partners)
  detailPartner: null,   // full partner object loaded for detail view
  detailDirty: false,
  detailEditMode: false, // Partner Detail is read-only until this is true (see "Edit" button)
  activeDetailTab: 'general',
  statusFilter: 'all',   // answer-status filter shared across General/every Product tab
  priorityFilter: 'all', // priority filter (combines with statusFilter via AND), same scope
  radarSelected: [],     // partner ids picked for the Comparison radar chart
  radarChart: null,      // current Chart.js instance, destroyed/rebuilt on selection change
  comparisonView: 'partners',       // 'partners' | 'products' sub-tab on the Comparison page
  productCompareCount: 2,           // 2-4, how many product slots to show
  productCompareSelected: ['', ''], // "partnerId:productId" per slot, '' = empty
};

// ── Brand colours ─────────────────────────────────────────────────────────
const COLORS = {
  navy:     '#2D2E88',
  red:      '#ED1651',
  midNavy:  '#5B5DB5',
  lightBlue:'#EEEEF8',
  yellow:   '#FFF9E6',
  chartPalette: [
    '#2D2E88','#ED1651','#5B5DB5','#16a34a','#d97706','#0891b2','#7c3aed','#be185d',
  ],
};

const STAGES = ['Under Evaluation', 'Eval Complete', 'Shortlisted', 'Decision'];

// Groups the 34 detailSections into the 6 management-facing domains defined
// in schema.json (schema.domains + each detailSection's domain field) for
// the Comparison heatmap columns — one column per domain rather than one
// per section, since 34 columns would be unreadable. Domains with zero
// sections (currently "Patents & Innovation", which rolls up from
// partner.patents[] instead) are skipped — that needs different rollup
// logic and isn't in the heatmap yet.
function comparisonGroups() {
  const schema = State.schema;
  return (schema.domains || [])
    .map(d => ({
      id: d.id,
      label: d.label,
      sectionIds: (schema.detailSections || []).filter(s => s.domain === d.id).map(s => s.id),
    }))
    .filter(g => g.sectionIds.length > 0);
}

// Partner Detail is read-only until State.detailEditMode is true (see the
// "Edit" button). Dropped directly into every form element's template
// string -- browser-enforced (a disabled element can't fire input/change),
// so handleDetailChange needs no parallel gating for these.
function editAttr() {
  return State.detailEditMode ? '' : 'disabled';
}

// ── API helpers ────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, isError = false) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Tab routing ────────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.topnav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + tabId);
  });
  if (tabId === 'overview')   renderOverview();
  if (tabId === 'comparison') renderComparison();
  if (tabId === 'decisions')  renderDecisionsFull();
}

// ── Decision status badge ────────────────────────────────────────────────
function statusBadge(s) {
  const map = {
    'Shortlisted': 'badge-shortlisted',
    'Hold':        'badge-hold',
    'Rejected':    'badge-rejected',
  };
  if (!s) return '';
  return `<span class="badge ${map[s] || 'badge-pending'}">${s}</span>`;
}

// ── Overview ───────────────────────────────────────────────────────────────
function renderOverview() {
  const partners = State.partnersSummary;

  // Stats
  const stats = document.getElementById('overview-stats');
  const shortlisted = partners.filter(p => p.decisionStatus === 'Shortlisted').length;
  const totalProducts = partners.reduce((a, p) => a + (p.productCount || 0), 0);
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Partners</div>
      <div class="stat-value">${partners.length}</div>
      <div class="stat-sub">under evaluation</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Shortlisted</div>
      <div class="stat-value">${shortlisted}</div>
      <div class="stat-sub">decision pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Products</div>
      <div class="stat-value">${totalProducts}</div>
      <div class="stat-sub">across all partners</div>
    </div>
    <div class="stat-card" id="stat-hero">
      <div class="stat-label">Hero Products</div>
      <div class="stat-value">…</div>
      <div class="stat-sub">differentiating products</div>
    </div>
  `;
  renderHeroStat(partners);

  // Pipeline board
  const board = document.getElementById('pipeline-board');
  board.innerHTML = STAGES.map(stage => {
    const cols = partners.filter(p => p.stage === stage);
    return `
      <div class="pipeline-col">
        <div class="pipeline-col-header">
          <span class="pipeline-col-title">${stage}</span>
          <span class="pipeline-col-count">${cols.length}</span>
        </div>
        <div class="pipeline-col-body">
          ${cols.length === 0
            ? '<div class="text-muted" style="font-size:.8125rem;text-align:center;padding:12px 0;">No partners</div>'
            : cols.map(p => renderPartnerCard(p)).join('')
          }
        </div>
      </div>
    `;
  }).join('');

  // Click cards to open detail
  board.querySelectorAll('.partner-card').forEach(card => {
    card.addEventListener('click', () => {
      openDetailFor(card.dataset.id);
    });
  });
}

// isHero lives on each product in the full partner record, not the
// lightweight summary list, so this stat needs its own fetch — same
// Promise.all pattern renderComparison uses. Counts hero-tagged products
// across the whole portfolio (a partner with 2 hero products counts as 2).
async function renderHeroStat(partners) {
  const cell = document.getElementById('stat-hero');
  if (!cell) return;
  if (partners.length === 0) {
    cell.querySelector('.stat-value').textContent = '0';
    return;
  }
  try {
    const fullPartners = await Promise.all(partners.map(p => api('GET', `/api/partners/${p.id}`)));
    const heroCount = fullPartners.reduce((sum, p) => {
      return sum + (p.products || []).filter(prod => prod.isHero).length;
    }, 0);
    if (cell.isConnected) cell.querySelector('.stat-value').textContent = String(heroCount);
  } catch (e) {
    if (cell.isConnected) cell.querySelector('.stat-value').textContent = '—';
  }
}

function renderPartnerCard(p) {
  const productCount = p.productCount || 0;
  return `
    <div class="partner-card" data-id="${p.id}">
      <div class="partner-card-name">${esc(p.name)}</div>
      <div class="partner-card-sub">${esc(p.evaluator || '')}${p.evaluationDate ? ' · ' + p.evaluationDate : ''}</div>
      <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
        <span class="text-muted" style="font-size:.75rem;">${productCount} product${productCount === 1 ? '' : 's'}</span>
        ${p.decisionStatus ? statusBadge(p.decisionStatus) : ''}
      </div>
    </div>
  `;
}

// ── Comparison ─────────────────────────────────────────────────────────────
// Section-completion heatmap: for each partner x section-group, what % of
// applicable questions (NA excluded) are Accomplished or Verified. General
// sections are answered once per partner; Product sections are rolled up
// across every product of that partner where the section is relevant
// (currently scope-matching, or kept via the same "sticky" rule the detail
// page itself uses so partially-unchecked sensors/functions don't make
// already-logged progress disappear from the comparison either).
// Heatmap shows the manually-entered domain grade (Master Category
// Grading sidebar card), not a computed completion %. A domain not yet
// graded for a partner shows as empty — no fallback metric, per explicit
// choice: the grade is a holistic judgment, not something to approximate
// mechanically from question-answer counts.
function gradeHeatmapClass(grade) {
  if (grade === 'outstanding') return 'hm-high';
  if (grade === 'good') return 'hm-mid';
  if (grade === 'developing') return 'hm-low';
  return 'hm-empty'; // '' (ungraded) or 'na'
}

function heatmapCellHtml(grade) {
  const cls = gradeHeatmapClass(grade);
  const label = grade ? gradeStatusLabel(grade) : '—';
  return `<td class="hm-cell ${cls}">${esc(label)}</td>`;
}

// Cached across Partners/Products sub-tab switches so toggling back and
// forth on the Comparison page doesn't re-fetch every partner each time —
// only a fresh page visit (renderComparison from switchTab) re-fetches.
let comparisonCache = null;

async function renderComparison() {
  const body = document.getElementById('comparison-body');
  if (!body) return;
  const summary = State.partnersSummary;
  if (summary.length === 0) {
    body.innerHTML = `<div class="empty-state">No partners yet.</div>`;
    comparisonCache = null;
    renderComparisonSubTabs();
    return;
  }
  body.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;

  const fullPartners = await Promise.all(summary.map(p => api('GET', `/api/partners/${p.id}`)));
  const groups = comparisonGroups();
  fullPartners.sort((a, b) => a.name.localeCompare(b.name));
  comparisonCache = { fullPartners, groups };

  renderComparisonSubTabs();
  renderComparisonActiveView();
}

function renderComparisonSubTabs() {
  const row = document.getElementById('comparison-subtab-row');
  if (!row) return;
  row.innerHTML = `
    <button class="detail-subtab${State.comparisonView === 'partners' ? ' active' : ''}" data-comparison-view="partners">Partners</button>
    <button class="detail-subtab${State.comparisonView === 'products' ? ' active' : ''}" data-comparison-view="products">Products</button>
  `;
  row.querySelectorAll('[data-comparison-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.comparisonView = btn.dataset.comparisonView;
      renderComparisonSubTabs();
      renderComparisonActiveView();
    });
  });
}

function renderComparisonActiveView() {
  const partnersView = document.getElementById('cmp-view-partners');
  const productsView = document.getElementById('cmp-view-products');
  if (!partnersView || !productsView) return;
  const showProducts = State.comparisonView === 'products';
  partnersView.style.display = showProducts ? 'none' : '';
  productsView.style.display = showProducts ? '' : 'none';
  if (!comparisonCache) return;
  if (showProducts) {
    renderProductComparisonView(comparisonCache.fullPartners);
  } else {
    renderComparisonPartnersView(comparisonCache.fullPartners, comparisonCache.groups);
  }
}

// Rows = domains, columns = partners (matches the row=category /
// column=partner orientation of the old main-branch score-matrix sheet).
function renderComparisonPartnersView(fullPartners, groups) {
  const body = document.getElementById('comparison-body');
  if (!body) return;
  const gradeFor = (partner, group) => (partner.domainGrades || []).find(x => x.domainId === group.id) || { grade: '' };

  body.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th class="hm-domain-col">Domain</th>
          ${fullPartners.map(p => `<th class="hm-partner-header" data-open-partner="${p.id}">${esc(p.name)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${groups.map(g => `
          <tr>
            <td class="hm-domain-name">${esc(g.label)}</td>
            ${fullPartners.map(p => heatmapCellHtml(gradeFor(p, g).grade)).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  body.querySelectorAll('[data-open-partner]').forEach(el => {
    el.addEventListener('click', () => openDetailFor(el.dataset.openPartner));
  });

  renderComparisonRadar(fullPartners, groups);
}

// ── Product Comparison (Step 3) ─────────────────────────────────────────────
// Compares 2-4 specific products side by side, possibly across different
// partners, rather than whole partners. Rows are every product-category
// section (always, not just sections common to the picked products) —
// sectionScopeMatches/cmpSectionHasAnswerData decide per-cell whether a
// section is applicable to that particular product, greying out the cell
// when it isn't, distinct from a real evaluator-marked NA answer.
const PRODUCT_COMPARE_COUNTS = [2, 3, 4];

function allProductsFlat(fullPartners) {
  const out = [];
  fullPartners.forEach(p => {
    (p.products || []).forEach(prod => {
      out.push({ partnerId: p.id, partnerName: p.name, productId: prod.id, productName: prod.name || 'Product' });
    });
  });
  out.sort((a, b) => a.partnerName.localeCompare(b.partnerName) || a.productName.localeCompare(b.productName));
  return out;
}

function findPartnerProduct(fullPartners, key) {
  if (!key) return null;
  const [partnerId, productId] = key.split(':');
  const partner = fullPartners.find(p => p.id === partnerId);
  const product = partner && (partner.products || []).find(pr => pr.id === productId);
  return product ? { partner, product } : null;
}

function productOptionsHtml(flat, selectedKey) {
  return `<option value="">Select a product…</option>` + flat.map(f => {
    const key = `${f.partnerId}:${f.productId}`;
    return `<option value="${key}"${key === selectedKey ? ' selected' : ''}>${esc(f.partnerName)} — ${esc(f.productName)}</option>`;
  }).join('');
}

function productPickerHtml(fullPartners) {
  const flat = allProductsFlat(fullPartners);
  const selects = [];
  for (let i = 0; i < State.productCompareCount; i++) {
    selects.push(`
      <select class="form-select" data-cmp-product-slot="${i}" style="width:260px;">
        ${productOptionsHtml(flat, State.productCompareSelected[i] || '')}
      </select>
    `);
  }
  return `
    <div class="toggle-pill-row" style="margin-bottom:14px;">
      ${PRODUCT_COMPARE_COUNTS.map(c => `<span class="toggle-pill${State.productCompareCount === c ? ' on' : ''}" data-cmp-count="${c}">${c} products</span>`).join('')}
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">${selects.join('')}</div>
  `;
}

function renderProductComparisonView(fullPartners) {
  const pickerEl = document.getElementById('cmp-product-picker');
  if (!pickerEl) return;
  pickerEl.innerHTML = productPickerHtml(fullPartners);

  pickerEl.querySelectorAll('[data-cmp-count]').forEach(el => {
    el.addEventListener('click', () => {
      const count = parseInt(el.dataset.cmpCount, 10);
      State.productCompareCount = count;
      const next = State.productCompareSelected.slice(0, count);
      while (next.length < count) next.push('');
      State.productCompareSelected = next;
      renderProductComparisonView(fullPartners);
    });
  });

  pickerEl.querySelectorAll('[data-cmp-product-slot]').forEach(el => {
    el.addEventListener('change', () => {
      const idx = parseInt(el.dataset.cmpProductSlot, 10);
      State.productCompareSelected[idx] = el.value;
      renderProductComparisonTable(fullPartners);
    });
  });

  renderProductComparisonTable(fullPartners);
}

function renderProductComparisonTable(fullPartners) {
  const tableEl = document.getElementById('cmp-product-table');
  if (!tableEl) return;

  const picked = State.productCompareSelected
    .map(key => findPartnerProduct(fullPartners, key))
    .filter(Boolean);

  if (picked.length === 0) {
    tableEl.innerHTML = `<div class="empty-state">Pick at least one product above to compare.</div>`;
    return;
  }

  const sectionEntries = sectionsForCategory('product').map(section => ({ section }));
  tableEl.innerHTML = domainGroupedSectionsHtml(
    sectionEntries,
    ({ section }) => cmpSectionCardHtml(section, picked)
  );

  tableEl.querySelectorAll('[data-section-toggle-header]').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.q-section-card');
      if (card) card.classList.toggle('collapsed');
    });
  });
  tableEl.querySelectorAll('[data-cmp-open-product]').forEach(el => {
    el.addEventListener('click', () => {
      const [partnerId, productId] = el.dataset.cmpOpenProduct.split(':');
      openDetailForProduct(partnerId, productId);
    });
  });
}

// Collapsed by default, unlike Partner Detail's section cards — this view
// has every product section x every picked product at once, which is a lot
// more rows than answering a single product's questions.
function cmpSectionCardHtml(section, picked) {
  const questions = questionsForSection(section.id);
  const bodyHtml = questions.length === 0
    ? `<div class="text-muted" style="font-size:.8125rem;">No questions defined for this section yet.</div>`
    : `
      <table class="cmp-product-table">
        <thead>
          <tr>
            <th class="cmp-q-num-col">#</th>
            <th class="cmp-q-text-col">Question</th>
            ${picked.map(({ partner, product }) => `<th data-cmp-open-product="${partner.id}:${product.id}">${esc(partner.name)} — ${esc(product.name || 'Product')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${questions.map(q => `
            <tr>
              <td class="cmp-q-num">${questionLabel(q)}</td>
              <td class="cmp-q-text">${esc(q.text)}</td>
              ${picked.map(({ product }) => cmpCellHtml(section, product, q)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  return `
    <div class="card q-section-card collapsed">
      <div class="card-header" data-section-toggle-header>
        <span class="card-title">${esc(section.label)} <span class="accordion-chevron">&#9662;</span></span>
      </div>
      <div class="card-body">${bodyHtml}</div>
    </div>
  `;
}

// Schema's answerStatuses keys use underscores (yet_to_start) but the
// .status-pill CSS classes use hyphens (status-yet-to-start) -- these two
// never had to agree before since the pill classes were only ever used in
// the static How-To mockup, never driven from real data until this table.
function statusPillClass(key) {
  return 'status-' + (key || 'na').replace(/_/g, '-');
}

// Mirrors sectionHasAnswerData's logic exactly, but schema questions only
// (questionsForSection, not questionsForSectionAll) -- drafts are
// partner-local with ids generated independently per partner, so comparing
// across partners by id would be wrong here, unlike on Partner Detail where
// only one partner is ever in scope at a time.
function cmpSectionHasAnswerData(section, product) {
  return questionsForSection(section.id).some(q => {
    const a = (product.answers || []).find(x => x.qId === q.id);
    return !!(a && (a.status || (a.remarks && a.remarks.trim()) || (a.partnerResponse && a.partnerResponse.trim())));
  });
}

function cmpCellHtml(section, product, q) {
  if (!sectionScopeMatches(section, product) && !cmpSectionHasAnswerData(section, product)) {
    return `<td class="cmp-inapplicable">N/A — not applicable to this product</td>`;
  }
  const ans = (product.answers || []).find(a => a.qId === q.id);
  if (!ans || !ans.status) {
    return `<td class="cmp-cell-empty">—</td>`;
  }
  const titleParts = [];
  if (ans.partnerResponse && ans.partnerResponse.trim()) titleParts.push('Response: ' + ans.partnerResponse.trim());
  if (ans.remarks && ans.remarks.trim()) titleParts.push('Remarks: ' + ans.remarks.trim());
  const titleAttr = titleParts.length ? ` title="${esc(titleParts.join('\n'))}"` : '';
  return `<td${titleAttr}><span class="status-pill ${statusPillClass(ans.status)}">${esc(answerStatusLabel(ans.status))}</span></td>`;
}

async function openDetailForProduct(partnerId, productId) {
  await openDetailFor(partnerId);
  State.activeDetailTab = 'product:' + productId;
  refreshDetailTabsAndPanels();
}

// ── Comparison radar chart ──────────────────────────────────────────────────
// Plots up to 4 partners' Master Category Grades on one radar, one axis per
// domain. Grades are qualitative (NA/Developing/Good/Outstanding) so they're
// mapped to 0-3 for plotting; NA/ungraded is plotted at 0 rather than
// excluded from the axis, for a single consistent rule instead of
// per-partner special-casing. Kept alongside the heatmap rather than
// replacing it — the radar gives an at-a-glance shape comparison, the
// heatmap gives the precise per-domain grade lookup the radar can't show.
const RADAR_MAX_PARTNERS = 4;
const GRADE_SCORE = { outstanding: 3, good: 2, developing: 1 };
function gradeToScore(grade) {
  return GRADE_SCORE[grade] || 0;
}

function renderComparisonRadar(partners, groups) {
  const picker = document.getElementById('radar-partner-picker');
  const canvas = document.getElementById('radar-chart');
  if (!picker || !canvas) return;

  if (!State.radarSelected) State.radarSelected = [];
  // Default selection: first 3 partners (alphabetical, matches table order).
  if (State.radarSelected.length === 0) {
    State.radarSelected = partners.slice(0, 3).map(p => p.id);
  }
  // Drop any selected ids that no longer exist (e.g. partner deleted).
  State.radarSelected = State.radarSelected.filter(id => partners.some(p => p.id === id));

  picker.innerHTML = partners.map(p => {
    const on = State.radarSelected.includes(p.id);
    return `<span class="toggle-pill${on ? ' on' : ''}" data-radar-pick="${p.id}">${esc(p.name)}</span>`;
  }).join('');

  picker.querySelectorAll('[data-radar-pick]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.radarPick;
      const idx = State.radarSelected.indexOf(id);
      if (idx >= 0) {
        State.radarSelected.splice(idx, 1);
      } else {
        if (State.radarSelected.length >= RADAR_MAX_PARTNERS) {
          toast(`Pick at most ${RADAR_MAX_PARTNERS} partners to compare on the radar.`, true);
          return;
        }
        State.radarSelected.push(id);
      }
      renderComparisonRadar(partners, groups);
    });
  });

  const selected = partners.filter(p => State.radarSelected.includes(p.id));
  const datasets = selected.map((p, i) => {
    const color = COLORS.chartPalette[i % COLORS.chartPalette.length];
    const data = groups.map(g => {
      const dg = (p.domainGrades || []).find(x => x.domainId === g.id);
      return gradeToScore(dg && dg.grade);
    });
    return {
      label: p.name,
      data,
      borderColor: color,
      backgroundColor: color + '33',
      pointBackgroundColor: color,
      borderWidth: 2,
    };
  });

  if (State.radarChart) {
    State.radarChart.destroy();
    State.radarChart = null;
  }
  if (selected.length === 0) return;

  State.radarChart = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: { labels: groups.map(g => g.label), datasets },
    options: {
      scales: {
        r: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            callback: v => ({ 0: 'NA', 1: 'Developing', 2: 'Good', 3: 'Outstanding' }[v] ?? v),
          },
        },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

// ── Partner Detail ─────────────────────────────────────────────────────────
async function openDetailFor(partnerId) {
  switchTab('detail');
  const sel = document.getElementById('detail-partner-select');
  sel.value = partnerId;
  await loadDetailPartner(partnerId);
}

async function loadDetailPartner(partnerId) {
  if (!partnerId) {
    State.detailPartner = null;
    State.detailEditMode = false;
    clearDirty();
    document.getElementById('detail-content').innerHTML =
      '<div class="select-partner-hint">Select a partner from the dropdown above.</div>';
    return;
  }
  document.getElementById('detail-content').innerHTML =
    '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const partner = await api('GET', `/api/partners/${partnerId}`);
    State.detailPartner = JSON.parse(JSON.stringify(partner));
    State.activeDetailTab = 'general';
    State.detailEditMode = false;
    clearDirty();
    renderDetailContent(partner);
  } catch (e) {
    toast('Failed to load partner: ' + e.message, true);
  }
}


function renderDetailContent(p) {
  const schema = State.schema;
  const content = document.getElementById('detail-content');
  content.innerHTML = `
    ${State.detailEditMode ? '' : `
      <div class="readonly-banner" id="readonly-banner">
        Viewing in read-only mode — every field and button is intentionally
        inert until you <button type="button" id="btn-detail-edit-banner">click here to Edit</button>.
      </div>
    `}
    <div class="detail-layout print-target${State.detailEditMode ? '' : ' detail-readonly'}">
      <!-- Sidebar -->
      <div class="detail-sidebar">
        <div class="card">
          <div class="card-header">
            <span class="card-title" id="detail-name-display">${esc(p.name)}</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" id="btn-edit-meta" ${editAttr()}>Edit Info</button>
              <button class="btn btn-danger btn-sm" id="btn-remove-partner" ${editAttr()}>Remove</button>
            </div>
          </div>
          <div class="card-body">
            <div class="info-block">
              <div class="info-row"><span class="label">Evaluator</span><span class="value" id="di-evaluator">${esc(p.evaluator || '—')}</span></div>
              <div class="info-row"><span class="label">Product / Version</span><span class="value" id="di-version">${esc(p.productVersion || '—')}</span></div>
              <div class="info-row"><span class="label">Eval Date</span><span class="value" id="di-date">${esc(p.evaluationDate || '—')}</span></div>
              <div class="info-row"><span class="label">Stage</span><span class="value">
                <select class="q-score-select" id="di-stage" style="width:auto;font-size:.8125rem;" data-field="stage" ${editAttr()}>
                  ${STAGES.map(s => `<option value="${s}"${p.stage === s ? ' selected' : ''}>${s}</option>`).join('')}
                </select>
                <span class="print-val">${esc(p.stage || '')}</span>
              </span></div>
            </div>
            <div class="info-block" style="margin-top:14px;">
              <div class="label" style="font-size:.75rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Business Model</div>
              <div class="toggle-pill-row">
                ${schema.businessModels.map(bm => {
                  const on = (p.businessModel || []).includes(bm);
                  return `<span class="toggle-pill${on ? ' on' : ''}" data-business-model="${esc(bm)}">${esc(bm)}</span>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Decision -->
        <div class="card" id="decision-card">
          <div class="card-header"><span class="card-title">Decision</span></div>
          <div class="card-body">
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Status</label>
              <select class="form-select" id="di-decision-status" data-decision-field="status" ${editAttr()}>
                <option value="">— select —</option>
                ${['Shortlisted','Hold','Rejected'].map(s =>
                  `<option value="${s}"${(p.decision||{}).status === s ? ' selected' : ''}>${s}</option>`
                ).join('')}
              </select>
              <span class="print-val">${esc((p.decision||{}).status || '')}</span>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Rationale</label>
              <textarea class="form-textarea" rows="4" id="di-decision-rationale" data-decision-field="rationale" ${editAttr()}
                placeholder="Describe the reasoning for this decision…">${esc((p.decision||{}).rationale || '')}</textarea>
              <div class="print-val">${esc((p.decision||{}).rationale || '')}</div>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Reviewer</label>
              <input class="form-input" id="di-decision-reviewer" type="text" ${editAttr()}
                value="${esc((p.decision||{}).reviewer || '')}" data-decision-field="reviewer" placeholder="Name / team" />
            </div>
            <div class="form-group">
              <label class="form-label">Decision Date</label>
              <input class="form-input" id="di-decision-date" type="date" ${editAttr()}
                value="${esc((p.decision||{}).date || '')}" data-decision-field="date" />
            </div>
          </div>
        </div>

        ${domainGradingCardHtml(p)}

        ${heroProductsCardHtml(p)}

        <!-- Hard Disqualifiers -->
        <div class="card">
          <div class="card-header"><span class="card-title">Hard Disqualifiers</span></div>
          <div class="card-body">
            <ul class="hard-disqualifier-list">
              ${schema.hardDisqualifiers.map(hd => {
                const flagged = (p.hardDisqualifiers || []).includes(hd);
                return `<li class="hard-disqualifier-item ${flagged ? '' : 'clear'}" style="cursor:pointer;" data-hd="${esc(hd)}">
                  <span>${flagged ? '✗' : '✓'}</span>
                  <span>${esc(hd)}</span>
                </li>`;
              }).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- Main content: General / Product / Notes tabs -->
      <div class="detail-main">
        <div class="detail-subtab-row" id="detail-subtab-row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:2px solid var(--gray-200);padding-bottom:0;margin-bottom:20px;">
          ${detailTabButtonsHtml(p, normalizeActiveDetailTab(p))}
        </div>
        <div id="detail-tab-panels">
          ${detailPanelsHtml(p, normalizeActiveDetailTab(p))}
        </div>
      </div>
    </div>
  `;

  bindDetailTabSwitching();
  autoGrowAll(document.getElementById('detail-tab-panels'));

  // Hard disqualifier toggles
  content.querySelectorAll('.hard-disqualifier-item').forEach(item => {
    item.addEventListener('click', () => {
      if (!State.detailEditMode) return;
      markDirty();
      const hd = item.dataset.hd;
      const list = State.detailPartner.hardDisqualifiers || [];
      const idx = list.indexOf(hd);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(hd);
      item.classList.toggle('clear', idx >= 0);
      item.querySelector('span').textContent = idx >= 0 ? '✓' : '✗';
    });
  });

  // Attach change listeners to all score/remarks inputs
  content.addEventListener('change', handleDetailChange);
  content.addEventListener('input', handleDetailChange);
  content.addEventListener('click', handleDetailClick);
  content.addEventListener('input', e => {
    if (e.target.tagName === 'TEXTAREA') autoGrowTextarea(e.target);
  });

  // Stage dropdown
  document.getElementById('di-stage').addEventListener('change', e => {
    markDirty();
    State.detailPartner.stage = e.target.value;
  });

  // Decision fields
  content.querySelectorAll('[data-decision-field]').forEach(el => {
    const syncPrintVal = () => {
      const pv = el.nextElementSibling;
      if (pv && pv.classList.contains('print-val')) pv.textContent = el.value;
    };
    el.addEventListener('input', () => {
      markDirty();
      if (!State.detailPartner.decision) State.detailPartner.decision = {};
      State.detailPartner.decision[el.dataset.decisionField] = el.value;
      syncPrintVal();
    });
    el.addEventListener('change', () => {
      markDirty();
      if (!State.detailPartner.decision) State.detailPartner.decision = {};
      State.detailPartner.decision[el.dataset.decisionField] = el.value;
      syncPrintVal();
    });
  });

  // Edit meta button
  document.getElementById('btn-edit-meta').addEventListener('click', () => {
    openEditMetaModal(p);
  });

  // Remove partner
  document.getElementById('btn-remove-partner').addEventListener('click', () => {
    removePartner(p);
  });

  // Read-only banner's inline Edit shortcut -- reuses the same toggle the
  // header's #btn-detail-edit button already runs, just one click closer
  // when you've scrolled past the header.
  const bannerEditBtn = document.getElementById('btn-detail-edit-banner');
  if (bannerEditBtn) bannerEditBtn.addEventListener('click', () => document.getElementById('btn-detail-edit').click());
}

async function removePartner(p) {
  if (!confirm(`Remove "${p.name}"? This permanently deletes the partner and all of its evaluation data. This cannot be undone.`)) return;
  try {
    await api('DELETE', `/api/partners/${p.id}`);
    toast(`"${p.name}" removed`);
    State.detailPartner = null;
    clearDirty();
    await refreshPartnersSummary();
    populateDetailSelect();
    document.getElementById('detail-partner-select').value = '';
    document.getElementById('detail-content').innerHTML =
      '<div class="select-partner-hint">Select a partner from the dropdown above to view their evaluation detail.</div>';
  } catch (e) {
    toast('Remove failed: ' + e.message, true);
  }
}

function handleDetailChange(e) {
  const el = e.target;

  // Keep print-val sibling in sync so PDF reflects current value
  const pv = el.nextElementSibling;
  if (pv && pv.classList.contains('print-val')) pv.textContent = el.value;

  // Answer status (general or product question)
  if (el.dataset.ansStatus) {
    markDirty();
    const [scope, a, b] = el.dataset.ansStatus.split(':');
    if (scope === 'general') {
      ensureGeneralAnswer(parseInt(a)).status = el.value;
    } else if (scope === 'product') {
      const ans = ensureProductAnswer(a, parseInt(b));
      if (ans) ans.status = el.value;
    }
    if (pv && pv.classList.contains('print-val')) pv.textContent = answerStatusLabel(el.value);
    const row = el.closest('.ans-row');
    if (row) row.dataset.rowStatus = el.value;
    return;
  }

  // Answer partner response (general or product question)
  if (el.dataset.ansPartnerResponse) {
    markDirty();
    const [scope, a, b] = el.dataset.ansPartnerResponse.split(':');
    if (scope === 'general') {
      ensureGeneralAnswer(parseInt(a)).partnerResponse = el.value;
    } else if (scope === 'product') {
      const ans = ensureProductAnswer(a, parseInt(b));
      if (ans) ans.partnerResponse = el.value;
    }
    return;
  }

  // Answer remarks (general or product question)
  if (el.dataset.ansRemarks) {
    markDirty();
    const [scope, a, b] = el.dataset.ansRemarks.split(':');
    if (scope === 'general') {
      ensureGeneralAnswer(parseInt(a)).remarks = el.value;
    } else if (scope === 'product') {
      const ans = ensureProductAnswer(a, parseInt(b));
      if (ans) ans.remarks = el.value;
    }
    return;
  }

  // Draft question text (unpublished, partner-local) — the generic
  // print-val sync at the top of this function already mirrors it.
  if (el.dataset.draftText) {
    markDirty();
    const draft = (State.detailPartner.draftQuestions || []).find(d => d.id === parseInt(el.dataset.draftText, 10));
    if (draft) draft.text = el.value;
    return;
  }

  // Draft question priority — just changes the row's colour-coded edge
  // now (see answerRowHtml), no tab to jump to anymore.
  if (el.dataset.draftPriority) {
    markDirty();
    const draftId = parseInt(el.dataset.draftPriority, 10);
    const draft = (State.detailPartner.draftQuestions || []).find(d => d.id === draftId);
    if (draft) draft.priority = el.value;
    refreshDetailTabsAndPanels();
    return;
  }

  // Section grade (general or product section) — key is "general:<sectionId>"
  // or "product:<prodId>:<sectionId>"; sectionId never contains ':'.
  if (el.dataset.sectionGrade) {
    markDirty();
    const [scope, a, b] = el.dataset.sectionGrade.split(':');
    if (scope === 'general') {
      ensureGeneralSectionGrade(a).grade = el.value;
    } else if (scope === 'product') {
      const g = ensureProductSectionGrade(a, b);
      if (g) g.grade = el.value;
    }
    if (pv && pv.classList.contains('print-val')) pv.textContent = gradeStatusLabel(el.value);
    return;
  }

  // Section grade justification
  if (el.dataset.sectionGradeJustification) {
    markDirty();
    const [scope, a, b] = el.dataset.sectionGradeJustification.split(':');
    if (scope === 'general') {
      ensureGeneralSectionGrade(a).justification = el.value;
    } else if (scope === 'product') {
      const g = ensureProductSectionGrade(a, b);
      if (g) g.justification = el.value;
    }
    return;
  }

  // Domain grade (always partner-level)
  if (el.dataset.domainGrade) {
    markDirty();
    ensureDomainGrade(el.dataset.domainGrade).grade = el.value;
    if (pv && pv.classList.contains('print-val')) pv.textContent = gradeStatusLabel(el.value);
    return;
  }

  // Domain grade justification
  if (el.dataset.domainGradeJustification) {
    markDirty();
    ensureDomainGrade(el.dataset.domainGradeJustification).justification = el.value;
    return;
  }

  // Product name
  if (el.dataset.productName) {
    markDirty();
    const prod = findProduct(el.dataset.productName);
    if (prod) prod.name = el.value;
    return;
  }

  // Product sensor note
  if (el.dataset.productNote) {
    markDirty();
    const [pid, key] = el.dataset.productNote.split(':');
    const prod = findProduct(pid);
    if (prod) {
      prod.sensorNotes = prod.sensorNotes || {};
      prod.sensorNotes[key] = el.value;
    }
    return;
  }

  // Product general notes (distinct from per-sensor notes above)
  if (el.dataset.productNotes) {
    markDirty();
    const prod = findProduct(el.dataset.productNotes);
    if (prod) prod.notes = el.value;
    return;
  }

  // Notes
  if (el.id === 'di-notes') {
    markDirty();
    State.detailPartner.notes = el.value;
    return;
  }

  // Patent relevance type — swaps the second control (sensor/function picker
  // vs. free-text label), so the card needs a targeted re-render.
  if (el.dataset.patentRelevanceType) {
    markDirty();
    const pt = findPatent(el.dataset.patentRelevanceType);
    if (pt) {
      pt.relevanceType = el.value;
      pt.relevanceKey = '';
      pt.relevanceLabel = '';
      const card = document.querySelector(`.patent-card[data-patent-id="${pt.id}"]`);
      if (card) {
        card.outerHTML = patentCardHtml(pt, State.schema);
        autoGrowAll(document.getElementById('detail-tab-patents'));
      }
    }
    return;
  }

  // Patent field (title, patentId, status, jurisdiction, grantedBy, notes,
  // relevanceKey, relevanceLabel) — all keyed "patentId:fieldName".
  if (el.dataset.patentField) {
    markDirty();
    const [ptId, field] = el.dataset.patentField.split(':');
    const pt = findPatent(ptId);
    if (pt) pt[field] = el.value;
    return;
  }
}

// ── Products & Portfolio tab ────────────────────────────────────────────────

function findProduct(productId) {
  return (State.detailPartner.products || []).find(pr => pr.id === productId);
}

function newProduct(schema, ordinal) {
  const sensors = {}, functions = {}, socs = {}, sensorNotes = {};
  schema.productSensors.forEach(s => { sensors[s.key] = false; sensorNotes[s.key] = ''; });
  schema.productFunctions.forEach(f => { functions[f.key] = false; });
  (schema.productSocs || []).forEach(c => { socs[c.key] = false; });
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'p' + Date.now().toString(16) + Math.random().toString(16).slice(2);
  // isHero: this whole product is one of the partner's differentiating
  // products (a partner with products A/B/C can have A and B both hero,
  // C not) -- used by the customer-meeting-prep view to elevate priority
  // regardless of a question's static tag.
  return { id, name: 'Product ' + ordinal, sensors, functions, socs, sensorNotes, notes: '', isHero: false, sectionGrades: [] };
}

function computePortfolio(products, schema) {
  const sensors = {}, functions = {}, socs = {};
  schema.productSensors.forEach(s => sensors[s.key] = false);
  schema.productFunctions.forEach(f => functions[f.key] = false);
  (schema.productSocs || []).forEach(c => socs[c.key] = false);
  (products || []).forEach(prod => {
    schema.productSensors.forEach(s => { if (prod.sensors && prod.sensors[s.key]) sensors[s.key] = true; });
    schema.productFunctions.forEach(f => { if (prod.functions && prod.functions[f.key]) functions[f.key] = true; });
    (schema.productSocs || []).forEach(c => { if (prod.socs && prod.socs[c.key]) socs[c.key] = true; });
  });
  return { sensors, functions, socs };
}

// ── General / Product / Notes tabs ──────────────────────────────────────────

function panelIdForTab(tabKey) {
  if (tabKey === 'general' || tabKey === 'notes' || tabKey === 'patents') return 'detail-tab-' + tabKey;
  if (tabKey.indexOf('product:') === 0) return 'detail-tab-product-' + tabKey.split(':')[1];
  return 'detail-tab-general';
}

function normalizeActiveDetailTab(p) {
  const products = p.products || [];
  const validKeys = ['general', 'patents', 'notes'].concat(products.map(pr => 'product:' + pr.id));
  if (!validKeys.includes(State.activeDetailTab)) State.activeDetailTab = 'general';
  return State.activeDetailTab;
}

function detailTabButtonsHtml(p, activeTab) {
  const products = p.products || [];
  let html = `<button class="detail-subtab${activeTab === 'general' ? ' active' : ''}" data-detail-tab="general">General</button>`;
  products.forEach(prod => {
    const key = 'product:' + prod.id;
    html += `<button class="detail-subtab${activeTab === key ? ' active' : ''}" data-detail-tab="${key}">${esc(prod.name || 'Product')}</button>`;
  });
  html += `<button class="btn btn-secondary btn-sm" data-add-product type="button" ${editAttr()}>+ Add Product</button>`;
  html += `<button class="detail-subtab${activeTab === 'patents' ? ' active' : ''}" data-detail-tab="patents">Patents</button>`;
  html += `<button class="detail-subtab${activeTab === 'notes' ? ' active' : ''}" data-detail-tab="notes">Notes</button>`;
  return html;
}

function detailPanelsHtml(p, activeTab) {
  const products = p.products || [];
  const mk = (key, inner) => `<div class="detail-tab-panel" id="${panelIdForTab(key)}"${key === activeTab ? '' : ' style="display:none;"'}>${inner}</div>`;
  let html = mk('general', generalTabHtml(p));
  products.forEach(prod => { html += mk('product:' + prod.id, productTabHtml(prod)); });
  html += mk('patents', patentsTabHtml(p));
  html += mk('notes', notesTabHtml(p));
  return html;
}

function bindDetailTabSwitching() {
  document.querySelectorAll('[data-detail-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.detailTab;
      State.activeDetailTab = tabKey;
      document.querySelectorAll('[data-detail-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.detail-tab-panel').forEach(panel => {
        panel.style.display = panel.id === panelIdForTab(tabKey) ? '' : 'none';
      });
      const shown = document.getElementById(panelIdForTab(tabKey));
      if (shown) autoGrowAll(shown);
    });
  });
}

function refreshDetailTabsAndPanels() {
  const p = State.detailPartner;
  const activeTab = normalizeActiveDetailTab(p);
  const tabRow = document.getElementById('detail-subtab-row');
  const panels = document.getElementById('detail-tab-panels');
  if (!tabRow || !panels) return;
  tabRow.innerHTML = detailTabButtonsHtml(p, activeTab);
  panels.innerHTML = detailPanelsHtml(p, activeTab);
  bindDetailTabSwitching();
  autoGrowAll(panels);
  refreshHeroProductsCard();
}

// The hero card's candidate pills depend on which sensors/functions are
// currently checked, so it needs re-rendering whenever a product is
// added/removed or a sensor/function is toggled — refreshDetailTabsAndPanels
// already runs on all of those, so piggyback on it rather than adding new
// call sites.
function refreshHeroProductsCard() {
  const card = document.getElementById('hero-products-card');
  if (!card) return;
  const p = State.detailPartner;
  card.outerHTML = heroProductsCardHtml(p);
}

function answerStatusLabel(key) {
  const s = (State.schema.answerStatuses || []).find(x => x.key === key);
  return s ? s.label : '';
}

// A draft's id is always a negative integer (see newDraftQuestion) — that
// sign alone marks it as unpublished, swapping the # column for a "Draft"
// badge and the read-only question text for an editable textarea, plus an
// actions row (priority / Publish / Discard) underneath. Everything else
// (status/response/remarks) is identical to a published question's row
// since answer storage is already qId-type-agnostic.
function answerRowHtml(q, ans, key) {
  const schema = State.schema;
  const isDraft = q.id < 0;
  const numCell = isDraft
    ? `<span class="draft-badge">Draft</span>`
    : `<span class="q-num">${questionLabel(q)}<button class="q-remove-btn" type="button" data-remove-question="${q.id}" title="Remove this question" ${editAttr()}>✕</button></span>`;
  const textCell = isDraft
    ? `<textarea class="q-remarks-input q-draft-text" rows="2" placeholder="Type the new question…" data-draft-text="${q.id}" ${editAttr()}>${esc(q.text)}</textarea><span class="print-val">${esc(q.text)}</span>`
    : `<div class="q-text">${esc(q.text)}</div>`;
  return `
    <div class="ans-row${isDraft ? ' ans-row-draft' : ''}" data-row-status="${esc(ans.status || '')}" data-priority="${esc(q.priority || 'medium')}">
      ${numCell}
      ${textCell}
      <select class="q-score-select" data-ans-status="${key}" ${editAttr()}>
        <option value="">— Select —</option>
        ${schema.answerStatuses.map(s => `<option value="${s.key}"${ans.status === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>
      <span class="print-val">${esc(answerStatusLabel(ans.status))}</span>
      <textarea class="q-remarks-input" rows="2" placeholder="Partner response…" data-ans-partner-response="${key}" ${editAttr()}>${esc(ans.partnerResponse || '')}</textarea>
      <span class="print-val">${esc(ans.partnerResponse || '')}</span>
      <textarea class="q-remarks-input" rows="2" placeholder="L&amp;T remarks…" data-ans-remarks="${key}" ${editAttr()}>${esc(ans.remarks || '')}</textarea>
      <span class="print-val">${esc(ans.remarks || '')}</span>
    </div>
    ${isDraft ? draftActionsRowHtml(q) : ''}
  `;
}

const PRIORITY_TABS = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

// Priority select + Publish/Discard, rendered as a full-width sibling
// below a draft's .ans-row (not a grid child of it) so it doesn't disturb
// the 5-column answer grid.
function draftActionsRowHtml(q) {
  return `
    <div class="draft-row-actions">
      <label class="text-muted">Priority
        <select class="q-score-select" data-draft-priority="${q.id}" ${editAttr()}>
          ${PRIORITY_TABS.map(p => `<option value="${p.key}"${q.priority === p.key ? ' selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </label>
      <button class="btn btn-secondary btn-sm" type="button" data-publish-draft-question="${q.id}" ${editAttr()}>Publish</button>
      <button class="btn btn-ghost btn-sm" type="button" data-remove-draft-question="${q.id}" ${editAttr()}>Discard draft</button>
    </div>
  `;
}

// Each question's priority (High/Medium/Low — see
// schema.detailQuestions[].priority) shows as a colour-coded left border
// on its row (see .ans-row[data-priority] in style.css) rather than a
// per-section sub-tab — narrowing to one priority at a time is what the
// global "Filter by priority" row (shared across every section on the
// tab) is for now.
function sectionGradeRowHtml(sectionGrade, gradeKey) {
  const schema = State.schema;
  return `
    <div class="section-grade-row">
      <label class="form-label">Section Grade</label>
      <select class="q-score-select section-grade-select" data-section-grade="${gradeKey}" ${editAttr()}>
        <option value="">— select —</option>
        ${schema.gradeStatuses.map(g => `<option value="${g.key}"${sectionGrade.grade === g.key ? ' selected' : ''}>${esc(g.label)}</option>`).join('')}
      </select>
      <span class="print-val">${esc(gradeStatusLabel(sectionGrade.grade))}</span>
      <textarea class="q-remarks-input" rows="2" placeholder="Justification for this grade…" data-section-grade-justification="${gradeKey}" ${editAttr()}>${esc(sectionGrade.justification || '')}</textarea>
      <span class="print-val">${esc(sectionGrade.justification || '')}</span>
    </div>
  `;
}

function answerQuestionsTableHtml(sectionId, title, questions, getAnswer, keyFor, inactiveNote, sectionGrade, gradeKey) {
  sectionGrade = sectionGrade || { grade: '', justification: '' };
  // Status + priority filters are a display-only concern (combined via
  // AND) — `questions.length` (used to decide "is this section empty")
  // stays based on the unfiltered count, so a fully-filtered-out section
  // still shows "No questions match the current filter" rather than the
  // misleading "No questions defined for this section yet."
  // Drafts (q.id < 0) are always exempt from both filters — you're
  // actively authoring them, not reviewing existing answers, so a
  // restrictive filter must never make "+ Add Question" look like it
  // silently does nothing (found via a real bug report: a draft
  // defaults to medium priority, so a "Low" priority filter hid it
  // completely even though it really was added).
  const filtered = questions.filter(q => {
    if (q.id < 0) return true;
    if (State.statusFilter !== 'all' && (getAnswer(q.id).status || '') !== State.statusFilter) return false;
    if (State.priorityFilter !== 'all' && q.priority !== State.priorityFilter) return false;
    return true;
  });

  const bodyHtml = questions.length === 0
    ? `<div class="text-muted" style="font-size:.8125rem;">No questions defined for this section yet.</div>`
    : filtered.length === 0
    ? `<div class="text-muted" style="font-size:.8125rem;">No questions match the current filter.</div>`
    : `
      <div class="ans-row q-table-header"><span>#</span><span>Question</span><span>Status</span><span>Partner Response</span><span>L&amp;T Remarks</span></div>
      ${filtered.map(q => answerRowHtml(q, getAnswer(q.id), keyFor(q.id))).join('')}
    `;

  return `
    <div class="card q-section-card">
      <div class="card-header" data-section-toggle-header>
        <span class="card-title">${esc(title)} <span class="accordion-chevron">&#9662;</span></span>
        ${inactiveNote ? `<span class="text-muted" style="font-size:.75rem;">${esc(inactiveNote)}</span>` : ''}
      </div>
      <div class="card-body">
        ${gradeKey ? sectionGradeRowHtml(sectionGrade, gradeKey) : ''}
        ${bodyHtml}
        <div class="q-section-footer">
          <button class="btn btn-secondary btn-sm" type="button" data-add-draft-question="${sectionId}" ${editAttr()}>+ Add Question</button>
        </div>
      </div>
    </div>
  `;
}

// Sections group questions within a category. A section's `scope` is either
// null (common — always shown) or { type: 'sensor'|'function'|'soc', keys: [...] },
// meaning it only appears on a product tab while that product has at least
// one of those sensors/functions/SoCs checked. This is the single mechanism
// behind Camera/Radar (sensor), AEB/ACC (function), and TDA4/Qualcomm (soc)
// scoped sections — adding a new scoped section never needs new code, just
// a new schema.detailSections entry.
function sectionsForCategory(category) {
  return (State.schema.detailSections || []).filter(s => s.category === category);
}

function questionsForSection(sectionId) {
  return (State.schema.detailQuestions || []).filter(q => q.sectionId === sectionId);
}

// Schema questions plus this partner's unpublished drafts for the section,
// merged so they render/answer/clear identically. A draft's id is always a
// negative integer (see newDraftQuestion) -- that sign is the only signal
// distinguishing it from a published question, so it never needs its own
// "is draft" field, and it's excluded from questionLabel's dotted
// numbering on purpose (drafts show a "Draft" badge instead).
function questionsForSectionAll(sectionId) {
  const drafts = (State.detailPartner.draftQuestions || []).filter(d => d.sectionId === sectionId);
  return questionsForSection(sectionId).concat(drafts);
}

// Dotted question numbering ("1.2.5" = 1st domain, 2nd section within that
// domain, 5th question within that section) — a computed display label
// only. The real identifier every answer is keyed on stays q.id (the global
// integer). Positional, so it's derived fresh from current schema order
// every render rather than stored: reordering sections/questions shifts the
// label, same as it would on a printed sheet (see plan.md Step 1).
function questionLabel(q) {
  const schema = State.schema;
  const section = (schema.detailSections || []).find(s => s.id === q.sectionId);
  if (!section) return String(q.id);
  const domainNum = (schema.domains || []).findIndex(d => d.id === section.domain) + 1;
  const sectionNum = (schema.detailSections || []).filter(s => s.domain === section.domain)
    .findIndex(s => s.id === section.id) + 1;
  const questionNum = questionsForSection(q.sectionId).findIndex(qq => qq.id === q.id) + 1;
  if (domainNum <= 0 || sectionNum <= 0 || questionNum <= 0) return String(q.id);
  return `${domainNum}.${sectionNum}.${questionNum}`;
}

// Maps a scope type to the product field it reads/writes.
function scopeField(type) {
  return { sensor: 'sensors', function: 'functions', soc: 'socs' }[type];
}

function scopeLabel(type, key) {
  const list = { sensor: State.schema.productSensors, function: State.schema.productFunctions, soc: State.schema.productSocs }[type] || [];
  const found = list.find(x => x.key === key);
  return found ? found.label : key;
}

function sectionScopeMatches(section, prod) {
  if (!section.scope || !section.scope.keys || section.scope.keys.length === 0) return true;
  const field = scopeField(section.scope.type);
  return section.scope.keys.some(key => prod[field] && prod[field][key]);
}

// A scoped section has answered data if any of its questions have a status
// or remarks recorded for this product — unchecking the underlying
// sensor/function/SoC must never make that data silently disappear.
function sectionHasAnswerData(section, prod) {
  return questionsForSectionAll(section.id).some(q => {
    const a = (prod.answers || []).find(x => x.qId === q.id);
    return !!(a && (a.status || (a.remarks && a.remarks.trim()) || (a.partnerResponse && a.partnerResponse.trim())));
  });
}

// Returns sections to render for a product, each flagged whether its
// scope currently matches ("active") or only kept visible because it has
// saved answers from before the sensor/function/SoC was unchecked.
function sectionsForProduct(prod) {
  return sectionsForCategory('product')
    .map(section => ({ section, active: sectionScopeMatches(section, prod) }))
    .filter(({ section, active }) => active || sectionHasAnswerData(section, prod));
}

// Toggling a sensor/function/SoC checkbox off can hide a whole scoped
// section. If that section (or, for sensors, the per-sensor notes field)
// already has saved data, this gates the uncheck behind a double
// confirmation and only then actually clears the data — so an accidental
// click can never silently lose anything. Returns true if the toggle
// should proceed (and applies the clear-on-confirm side effect itself).
function tryToggleScopedField(prod, type, key) {
  const field = scopeField(type);
  prod[field] = prod[field] || {};
  const turningOff = !!prod[field][key];

  if (turningOff) {
    const section = sectionsForCategory('product').find(s => s.scope && s.scope.type === type && s.scope.keys.includes(key));
    const hasAnswers = section && sectionHasAnswerData(section, prod);
    const hasNotes = type === 'sensor' && !!(prod.sensorNotes && prod.sensorNotes[key] && prod.sensorNotes[key].trim());
    if (hasAnswers || hasNotes) {
      const label = scopeLabel(type, key);
      const what = hasNotes && hasAnswers ? 'answers/notes' : (hasNotes ? 'notes' : 'answers');
      if (!confirm(`${label} data has already been filled in for "${prod.name || 'this product'}". Unchecking ${label} will remove the ${label} section and its saved ${what}.\n\nContinue?`)) return false;
      if (!confirm(`Are you sure? This cannot be undone once you Save.`)) return false;
      if (section) {
        const qIds = questionsForSectionAll(section.id).map(q => q.id);
        prod.answers = (prod.answers || []).filter(a => !qIds.includes(a.qId));
      }
      if (hasNotes) prod.sensorNotes[key] = '';
    }
  }

  prod[field][key] = !prod[field][key];
  return true;
}

// Groups a tab's sections under their master domain heading (schema.domains
// + detailSection.domain), in domain order, skipping domains with nothing
// to show. Shared by General and Product tabs — each calls this with its
// own per-section render function since they bind answers differently
// (partner.generalAnswers vs product.answers).
// Domain grading deliberately does NOT live here. A domain (e.g. "Company
// Background") can have members in BOTH General and Product sections, so
// its heading would otherwise repeat once per sub-tab (General + every
// Product tab) — same underlying partner-level value, shown redundantly
// and confusingly in multiple places. Domain grading instead lives in a
// single page-agnostic sidebar card (domainGradingCardHtml, in
// renderDetailContent) that's visible no matter which sub-tab is active.
function domainGroupedSectionsHtml(sectionEntries, renderSectionFn) {
  const domains = State.schema.domains || [];
  const byDomain = {};
  sectionEntries.forEach(entry => {
    const domId = entry.section.domain;
    (byDomain[domId] = byDomain[domId] || []).push(entry);
  });
  return domains
    .filter(d => byDomain[d.id] && byDomain[d.id].length > 0)
    .map(d => `
      <div class="domain-group">
        <div class="domain-group-heading">${esc(d.label)}</div>
        ${byDomain[d.id].map(renderSectionFn).join('')}
      </div>
    `).join('');
}

// Sidebar card for grading the 6 master domains — rendered once per partner,
// independent of which sub-tab (General/Product N/Patents/Notes) is active.
function domainGradingCardHtml(p) {
  const schema = State.schema;
  return `
    <div class="card" id="domain-grading-card">
      <div class="card-header"><span class="card-title">Master Category Grading</span></div>
      <div class="card-body">
        ${(schema.domains || []).map(d => {
          const dg = getDomainGrade(d.id);
          return `
            <div class="domain-grade-sidebar-row">
              <div class="domain-grade-sidebar-label">${esc(d.label)}</div>
              <select class="form-select" data-domain-grade="${d.id}" ${editAttr()}>
                <option value="">— select —</option>
                ${schema.gradeStatuses.map(g => `<option value="${g.key}"${dg.grade === g.key ? ' selected' : ''}>${esc(g.label)}</option>`).join('')}
              </select>
              <span class="print-val">${esc(gradeStatusLabel(dg.grade))}</span>
              <textarea class="form-textarea" rows="2" placeholder="Justification…" data-domain-grade-justification="${d.id}" ${editAttr()}>${esc(dg.justification || '')}</textarea>
              <div class="print-val">${esc(dg.justification || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Sidebar card for tagging which of a partner's products are themselves
// the differentiating "hero" product(s) — rendered once per partner,
// independent of which sub-tab is active, mirroring the
// domain-grading-card precedent above. Whole-product flag, not a
// per-sensor/function one: a partner with products A/B/C can have A and B
// both marked hero while C isn't.
function heroProductsCardHtml(p) {
  const products = p.products || [];
  if (products.length === 0) {
    return `
      <div class="card" id="hero-products-card">
        <div class="card-header"><span class="card-title">Hero Products</span></div>
        <div class="card-body">
          <div class="text-muted" style="font-size:.8125rem;">No products yet — add one first.</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="card" id="hero-products-card">
      <div class="card-header"><span class="card-title">Hero Products</span></div>
      <div class="card-body">
        ${products.map(prod => `
          <div class="hero-product-row">
            <span class="toggle-pill hero-pill${prod.isHero ? ' on' : ''}" data-toggle-hero-product="${prod.id}">★ ${esc(prod.name || 'Product')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// One filter control per tab (not per section) — a single shared
// State.statusFilter applies across General and every Product tab, so
// switching tabs keeps whatever filter you had selected, same as
// State.activeDetailTab already persists. Labels come straight from
// schema.answerStatuses, so this needs no new schema entry and stays in
// sync if that list ever changes.
function detailFilterRowHtml() {
  const statuses = State.schema.answerStatuses || [];
  return `
    <div class="detail-filter-row">
      <div>
        <span class="text-muted" style="font-size:.75rem;margin-right:6px;">Filter by status:</span>
        <div class="toggle-pill-row" style="display:inline-flex;">
          <span class="toggle-pill${State.statusFilter === 'all' ? ' on' : ''}" data-status-filter="all">All</span>
          ${statuses.map(s => `<span class="toggle-pill${State.statusFilter === s.key ? ' on' : ''}" data-status-filter="${s.key}">${esc(s.label)}</span>`).join('')}
        </div>
      </div>
      <div>
        <span class="text-muted" style="font-size:.75rem;margin-right:6px;">Filter by priority:</span>
        <div class="toggle-pill-row" style="display:inline-flex;">
          <span class="toggle-pill${State.priorityFilter === 'all' ? ' on' : ''}" data-priority-filter="all">All</span>
          ${PRIORITY_TABS.map(p => `<span class="toggle-pill${State.priorityFilter === p.key ? ' on' : ''}" data-priority-filter="${p.key}">${p.label}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function generalTabHtml(p) {
  const schema = State.schema;
  const products = p.products || [];
  const portfolio = computePortfolio(products, schema);
  const sections = sectionsForCategory('general');

  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Company Portfolio (derived from products)</span></div>
      <div class="card-body">
        <div class="portfolio-summary">
          <div class="portfolio-summary-label">Sensors</div>
          <div class="toggle-pill-row">
            ${schema.productSensors.map(s =>
              `<span class="toggle-pill readonly${portfolio.sensors[s.key] ? ' on' : ''}">${esc(s.label)}</span>`
            ).join('')}
          </div>
          <div class="portfolio-summary-label">Functions</div>
          <div class="toggle-pill-row">
            ${schema.productFunctions.map(f =>
              `<span class="toggle-pill readonly${portfolio.functions[f.key] ? ' on' : ''}">${esc(f.label)}</span>`
            ).join('')}
          </div>
          <div class="portfolio-summary-label">SoCs</div>
          <div class="toggle-pill-row">
            ${(schema.productSocs || []).map(c =>
              `<span class="toggle-pill readonly${portfolio.socs[c.key] ? ' on' : ''}">${esc(c.label)}</span>`
            ).join('')}
          </div>
        </div>
        ${products.length === 0 ? '<div class="text-muted" style="font-size:.8125rem;margin-top:8px;">No products added yet — use "+ Add Product" above.</div>' : ''}
      </div>
    </div>
    ${detailFilterRowHtml()}
    ${domainGroupedSectionsHtml(
      sections.map(sec => ({ section: sec })),
      ({ section }) => answerQuestionsTableHtml(section.id, section.label, questionsForSectionAll(section.id),
        qId => (p.generalAnswers || []).find(x => x.qId === qId) || { status: '', remarks: '' },
        qId => `general:${qId}`,
        null,
        getGeneralSectionGrade(section.id),
        `general:${section.id}`)
    )}
  `;
}

function productTabHtml(prod) {
  const schema = State.schema;
  const sections = sectionsForProduct(prod);
  return `
    ${productCardHtml(prod, schema)}
    ${detailFilterRowHtml()}
    ${domainGroupedSectionsHtml(
      sections.map(({ section, active }) => ({ section, active })),
      ({ section, active }) => answerQuestionsTableHtml(section.id, section.label, questionsForSectionAll(section.id),
        qId => (prod.answers || []).find(x => x.qId === qId) || { status: '', remarks: '' },
        qId => `product:${prod.id}:${qId}`,
        active ? null : 'Sensor unchecked — kept visible because it has saved answers',
        getProductSectionGrade(prod, section.id),
        `product:${prod.id}:${section.id}`)
    )}
  `;
}

function notesTabHtml(p) {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">General Notes</span></div>
      <div class="card-body">
        <textarea class="form-textarea" style="min-height:300px;" id="di-notes" ${editAttr()}
          placeholder="Any general notes, meeting summaries, open questions…">${esc(p.notes || '')}</textarea>
        <div class="print-val">${esc(p.notes || '')}</div>
      </div>
    </div>
  `;
}

// ── Patents tab ──────────────────────────────────────────────────────────
// Patents live at partner level (not nested in a product) since a single
// patent often isn't tied to one product instance. "Relevant To" is a loose
// tag rather than a hard scope — sensor/function reuse the existing
// productSensors/productFunctions lists; Perception/Hardware/Custom are
// free text since there's no fixed taxonomy for those yet.

function findPatent(patentId) {
  return (State.detailPartner.patents || []).find(pt => pt.id === patentId);
}

function newPatent(ordinal) {
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'pt' + Date.now().toString(16) + Math.random().toString(16).slice(2);
  return {
    id, title: 'Patent ' + ordinal, patentId: '', status: '',
    grantedBy: '', jurisdiction: '',
    relevanceType: '', relevanceKey: '', relevanceLabel: '',
    notes: '',
  };
}

function patentCardHtml(pt, schema) {
  const relevanceType = pt.relevanceType || '';
  let relevanceControl = '<div class="text-muted" style="font-size:.8125rem;padding-top:8px;">—</div>';
  if (relevanceType === 'sensor') {
    relevanceControl = `
      <select class="form-select" data-patent-field="${pt.id}:relevanceKey" ${editAttr()}>
        <option value="">— select sensor —</option>
        ${schema.productSensors.map(s => `<option value="${s.key}"${pt.relevanceKey === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>`;
  } else if (relevanceType === 'function') {
    relevanceControl = `
      <select class="form-select" data-patent-field="${pt.id}:relevanceKey" ${editAttr()}>
        <option value="">— select function —</option>
        ${schema.productFunctions.map(f => `<option value="${f.key}"${pt.relevanceKey === f.key ? ' selected' : ''}>${esc(f.label)}</option>`).join('')}
      </select>`;
  } else if (relevanceType) {
    relevanceControl = `
      <input class="form-input" type="text" placeholder="What is this relevant to?" ${editAttr()}
        data-patent-field="${pt.id}:relevanceLabel" value="${esc(pt.relevanceLabel || '')}" />`;
  }

  return `
    <div class="card patent-card" data-patent-id="${pt.id}">
      <div class="card-header">
        <input class="form-input" style="font-weight:600;max-width:280px;" ${editAttr()}
          data-patent-field="${pt.id}:title" value="${esc(pt.title || '')}" />
        <button class="btn btn-danger btn-sm" data-remove-patent="${pt.id}" type="button" ${editAttr()}>Remove</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div class="form-group">
            <label class="form-label">Patent ID / Application No.</label>
            <input class="form-input" type="text" placeholder="e.g. US17/123,456" ${editAttr()}
              data-patent-field="${pt.id}:patentId" value="${esc(pt.patentId || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" data-patent-field="${pt.id}:status" ${editAttr()}>
              <option value="">— select —</option>
              ${schema.patentStatuses.map(s => `<option value="${s.key}"${pt.status === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Jurisdiction</label>
            <input class="form-input" type="text" placeholder="e.g. India, US, EU" ${editAttr()}
              data-patent-field="${pt.id}:jurisdiction" value="${esc(pt.jurisdiction || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Granted By</label>
            <input class="form-input" type="text" placeholder="e.g. USPTO, IPO India" ${editAttr()}
              data-patent-field="${pt.id}:grantedBy" value="${esc(pt.grantedBy || '')}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div class="form-group">
            <label class="form-label">Relevant To</label>
            <select class="form-select" data-patent-relevance-type="${pt.id}" ${editAttr()}>
              <option value="">— none —</option>
              ${schema.patentRelevanceTypes.map(r => `<option value="${r.key}"${relevanceType === r.key ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">&nbsp;</label>
            ${relevanceControl}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" rows="2" placeholder="Notes…" ${editAttr()}
            data-patent-field="${pt.id}:notes">${esc(pt.notes || '')}</textarea>
        </div>
      </div>
    </div>
  `;
}

function patentsTabHtml(p) {
  const schema = State.schema;
  const patents = p.patents || [];
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="btn btn-secondary btn-sm" data-add-patent type="button" ${editAttr()}>+ Add Patent</button>
    </div>
    ${patents.length === 0
      ? '<div class="text-muted" style="font-size:.8125rem;">No patents added yet.</div>'
      : patents.map(pt => patentCardHtml(pt, schema)).join('')}
  `;
}

function ensureGeneralAnswer(qId) {
  const list = State.detailPartner.generalAnswers || (State.detailPartner.generalAnswers = []);
  let a = list.find(x => x.qId === qId);
  if (!a) { a = { qId, status: '', partnerResponse: '', remarks: '' }; list.push(a); }
  return a;
}

function ensureProductAnswer(productId, qId) {
  const prod = findProduct(productId);
  if (!prod) return null;
  const list = prod.answers || (prod.answers = []);
  let a = list.find(x => x.qId === qId);
  if (!a) { a = { qId, status: '', partnerResponse: '', remarks: '' }; list.push(a); }
  return a;
}

// ── Section/domain grading (NA/Developing/Good/Outstanding + justification) ──
// Orthogonal to per-question completion status: a section can be fully
// "Verified" question-by-question yet still graded "Developing" in quality,
// or vice versa. Section grades follow the same General-vs-Product split as
// answers (General sections graded once per partner, Product sections once
// per product); domain grades are always partner-level holistic judgments,
// independent of their subsections' grades.
function gradeStatusLabel(key) {
  const s = (State.schema.gradeStatuses || []).find(x => x.key === key);
  return s ? s.label : '';
}

// Read-only lookups — used during render, never mutate.
function getGeneralSectionGrade(sectionId) {
  return (State.detailPartner.sectionGrades || []).find(x => x.sectionId === sectionId) || { grade: '', justification: '' };
}
function getProductSectionGrade(prod, sectionId) {
  return (prod.sectionGrades || []).find(x => x.sectionId === sectionId) || { grade: '', justification: '' };
}
function getDomainGrade(domainId) {
  return (State.detailPartner.domainGrades || []).find(x => x.domainId === domainId) || { grade: '', justification: '' };
}

// Mutating "ensure" helpers — only called from handleDetailChange.
function ensureGeneralSectionGrade(sectionId) {
  const list = State.detailPartner.sectionGrades || (State.detailPartner.sectionGrades = []);
  let g = list.find(x => x.sectionId === sectionId);
  if (!g) { g = { sectionId, grade: '', justification: '' }; list.push(g); }
  return g;
}
function ensureProductSectionGrade(productId, sectionId) {
  const prod = findProduct(productId);
  if (!prod) return null;
  const list = prod.sectionGrades || (prod.sectionGrades = []);
  let g = list.find(x => x.sectionId === sectionId);
  if (!g) { g = { sectionId, grade: '', justification: '' }; list.push(g); }
  return g;
}
function ensureDomainGrade(domainId) {
  const list = State.detailPartner.domainGrades || (State.detailPartner.domainGrades = []);
  let g = list.find(x => x.domainId === domainId);
  if (!g) { g = { domainId, grade: '', justification: '' }; list.push(g); }
  return g;
}

function productCardHtml(prod, schema) {
  return `
    <div class="card product-card" data-product-id="${prod.id}">
      <div class="card-header">
        <input class="form-input" style="font-weight:600;max-width:280px;" ${editAttr()}
          data-product-name="${prod.id}" value="${esc(prod.name || '')}" />
        <button class="btn btn-danger btn-sm" data-remove-product="${prod.id}" type="button" ${editAttr()}>Remove</button>
      </div>
      <div class="card-body">
        <div class="product-toggle-label">Sensors</div>
        <div class="toggle-pill-row" style="margin-bottom:8px;">
          ${schema.productSensors.map(s => {
            const on = !!(prod.sensors && prod.sensors[s.key]);
            return `<span class="toggle-pill${on ? ' on' : ''}" data-toggle-sensor="${prod.id}:${s.key}">${esc(s.label)}</span>`;
          }).join('')}
        </div>
        ${schema.productSensors.filter(s => {
          const checked = prod.sensors && prod.sensors[s.key];
          const hasNote = prod.sensorNotes && prod.sensorNotes[s.key] && prod.sensorNotes[s.key].trim();
          return checked || hasNote; // keep visible if notes exist even after the sensor is unchecked
        }).map(s => {
          const checked = !!(prod.sensors && prod.sensors[s.key]);
          return `
          <div class="product-note-group">
            <label class="form-label">${esc(s.label)} notes — spec, details…${checked ? '' : ' <span class="text-muted" style="font-weight:400;">(sensor unchecked — kept because it has saved notes)</span>'}</label>
            <textarea class="form-textarea" rows="2" placeholder="${esc(s.label)} spec / notes…" ${editAttr()}
              data-product-note="${prod.id}:${s.key}">${esc((prod.sensorNotes && prod.sensorNotes[s.key]) || '')}</textarea>
            <div class="print-val">${esc((prod.sensorNotes && prod.sensorNotes[s.key]) || '')}</div>
          </div>
        `;
        }).join('')}
        <div class="product-toggle-label" style="margin-top:14px;display:flex;align-items:center;gap:8px;">
          Functions
          <button class="btn btn-secondary btn-sm" type="button" data-add-function style="padding:1px 8px;font-size:.6875rem;font-weight:600;text-transform:none;letter-spacing:0;" ${editAttr()}>+ Add Function</button>
        </div>
        <div class="toggle-pill-row" style="margin-bottom:8px;">
          ${schema.productFunctions.map(f => {
            const on = !!(prod.functions && prod.functions[f.key]);
            return `<span class="toggle-pill${on ? ' on' : ''}" data-toggle-function="${prod.id}:${f.key}">${esc(f.label)}</span>`;
          }).join('')}
        </div>
        ${(() => {
          const socChecked = !!(prod.sensors && prod.sensors.soc);
          const hasSocSelected = (schema.productSocs || []).some(c => prod.socs && prod.socs[c.key]);
          if (!socChecked && !hasSocSelected) return '';
          return `
            <div class="product-toggle-label" style="margin-top:14px;">SoCs${socChecked ? '' : ' <span class="text-muted" style="font-weight:400;">(SoC unchecked — kept because a type is already selected)</span>'}</div>
            <div class="toggle-pill-row">
              ${(schema.productSocs || []).map(c => {
                const on = !!(prod.socs && prod.socs[c.key]);
                return `<span class="toggle-pill${on ? ' on' : ''}" data-toggle-soc="${prod.id}:${c.key}">${esc(c.label)}</span>`;
              }).join('')}
            </div>
          `;
        })()}
        <div class="product-toggle-label" style="margin-top:14px;">Notes</div>
        <textarea class="form-textarea" rows="3" placeholder="General notes for this product — anything that doesn't fit a specific sensor/function…" ${editAttr()}
          data-product-notes="${prod.id}">${esc(prod.notes || '')}</textarea>
        <div class="print-val">${esc(prod.notes || '')}</div>
      </div>
    </div>
  `;
}

async function handleDetailClick(e) {
  // Collapsible question-table sections — click the heading to toggle.
  // Checked first since the header sits outside the other data-* targets.
  const sectionHeader = e.target.closest('[data-section-toggle-header]');
  if (sectionHeader) {
    const card = sectionHeader.closest('.q-section-card');
    if (card) card.classList.toggle('collapsed');
    return;
  }

  const el = e.target.closest('[data-business-model],[data-add-product],[data-remove-product],[data-toggle-sensor],[data-toggle-function],[data-toggle-soc],[data-toggle-hero-product],[data-add-patent],[data-remove-patent],[data-add-draft-question],[data-remove-draft-question],[data-publish-draft-question],[data-remove-question],[data-status-filter],[data-priority-filter],[data-add-function]');
  if (!el) return;

  // Every action reachable here mutates partner data except the status
  // and priority filters (view-only display toggles) -- buttons in this
  // list already get `disabled` baked into their template when not in
  // edit mode, but the pill-style toggles (sensors/functions/SoCs/
  // hero-products/business model) are plain <span>s, which can't be
  // disabled, so they need this explicit guard instead.
  if (!State.detailEditMode && el.dataset.statusFilter === undefined && el.dataset.priorityFilter === undefined) return;

  if (el.dataset.businessModel !== undefined) {
    markDirty();
    const list = State.detailPartner.businessModel || (State.detailPartner.businessModel = []);
    const idx = list.indexOf(el.dataset.businessModel);
    if (idx >= 0) list.splice(idx, 1); else list.push(el.dataset.businessModel);
    el.classList.toggle('on', idx < 0);
    return;
  }

  if (el.dataset.addProduct !== undefined) {
    markDirty();
    const products = State.detailPartner.products || (State.detailPartner.products = []);
    products.push(newProduct(State.schema, products.length + 1));
    State.activeDetailTab = 'product:' + products[products.length - 1].id;
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.removeProduct) {
    const prod = findProduct(el.dataset.removeProduct);
    const name = (prod && prod.name) || 'this product';
    if (!confirm(`Remove "${name}"? This deletes all its sensor/function settings and answered questions. This cannot be undone once you Save.`)) return;
    markDirty();
    State.detailPartner.products = (State.detailPartner.products || []).filter(pr => pr.id !== el.dataset.removeProduct);
    if (State.activeDetailTab === 'product:' + el.dataset.removeProduct) State.activeDetailTab = 'general';
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.toggleSensor) {
    const [pid, key] = el.dataset.toggleSensor.split(':');
    const prod = findProduct(pid);
    if (!prod) return;
    if (tryToggleScopedField(prod, 'sensor', key)) { markDirty(); refreshDetailTabsAndPanels(); }
    return;
  }

  if (el.dataset.toggleFunction) {
    const [pid, key] = el.dataset.toggleFunction.split(':');
    const prod = findProduct(pid);
    if (!prod) return;
    if (tryToggleScopedField(prod, 'function', key)) { markDirty(); refreshDetailTabsAndPanels(); }
    return;
  }

  if (el.dataset.toggleSoc) {
    const [pid, key] = el.dataset.toggleSoc.split(':');
    const prod = findProduct(pid);
    if (!prod) return;
    if (tryToggleScopedField(prod, 'soc', key)) { markDirty(); refreshDetailTabsAndPanels(); }
    return;
  }

  if (el.dataset.toggleHeroProduct) {
    const prod = findProduct(el.dataset.toggleHeroProduct);
    if (!prod) return;
    markDirty();
    prod.isHero = !prod.isHero;
    el.classList.toggle('on', prod.isHero);
    return;
  }

  if (el.dataset.addPatent !== undefined) {
    markDirty();
    const patents = State.detailPartner.patents || (State.detailPartner.patents = []);
    patents.push(newPatent(patents.length + 1));
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.removePatent) {
    const pt = findPatent(el.dataset.removePatent);
    const title = (pt && pt.title) || 'this patent';
    if (!confirm(`Remove "${title}"? This cannot be undone once you Save.`)) return;
    markDirty();
    State.detailPartner.patents = (State.detailPartner.patents || []).filter(x => x.id !== el.dataset.removePatent);
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.addDraftQuestion !== undefined) {
    markDirty();
    const sectionId = el.dataset.addDraftQuestion;
    // A scoped product section can be rendered on more than one product
    // tab at once (all tabs exist in the DOM simultaneously, just
    // hidden), so the re-query below is scoped to the panel this click
    // came from.
    const panelId = el.closest('.detail-tab-panel')?.id;
    const drafts = State.detailPartner.draftQuestions || (State.detailPartner.draftQuestions = []);
    const nextId = Math.min(0, ...drafts.map(d => d.id)) - 1;
    drafts.push({ id: nextId, sectionId, text: '', priority: 'medium' });
    refreshDetailTabsAndPanels();
    // Focus the new draft's text box — every priority renders in one
    // flat list now, so there's no tab to jump to first.
    if (panelId) {
      const card = document.querySelector(`#${panelId} [data-add-draft-question="${CSS.escape(sectionId)}"]`)?.closest('.q-section-card');
      const textarea = card?.querySelector(`[data-draft-text="${nextId}"]`);
      if (textarea) { textarea.focus(); autoGrowTextarea(textarea); }
    }
    return;
  }

  if (el.dataset.removeDraftQuestion) {
    const draftId = parseInt(el.dataset.removeDraftQuestion, 10);
    if (!confirm('Discard this draft question? Any answer recorded against it will be lost once you Save.')) return;
    markDirty();
    State.detailPartner.draftQuestions = (State.detailPartner.draftQuestions || []).filter(d => d.id !== draftId);
    State.detailPartner.generalAnswers = (State.detailPartner.generalAnswers || []).filter(a => a.qId !== draftId);
    (State.detailPartner.products || []).forEach(prod => {
      prod.answers = (prod.answers || []).filter(a => a.qId !== draftId);
    });
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.publishDraftQuestion) {
    const draftId = parseInt(el.dataset.publishDraftQuestion, 10);
    const draft = (State.detailPartner.draftQuestions || []).find(d => d.id === draftId);
    if (!draft) return;
    if (!draft.text.trim()) { toast('Add question text before publishing', true); return; }
    if (!confirm(`Publish "${draft.text.trim()}"? It will be added to the master question list and appear on every matching product across every partner. This cannot be undone.`)) return;

    try {
      const published = await api('POST', '/api/schema/questions', {
        sectionId: draft.sectionId, text: draft.text.trim(), priority: draft.priority || 'medium',
      });
      State.schema.detailQuestions.push(published);
      State.detailPartner.draftQuestions = State.detailPartner.draftQuestions.filter(d => d.id !== draftId);
      // Re-key this partner's existing answer (general or per-product) from
      // the draft id to the new real qId so it isn't lost.
      (State.detailPartner.generalAnswers || []).forEach(a => { if (a.qId === draftId) a.qId = published.id; });
      (State.detailPartner.products || []).forEach(prod => {
        (prod.answers || []).forEach(a => { if (a.qId === draftId) a.qId = published.id; });
      });
      markDirty();
      refreshDetailTabsAndPanels();
      await saveDetail();
      toast('Published — now visible on every matching product and partner.');
    } catch (err) {
      toast('Publish failed: ' + err.message, true);
    }
    return;
  }

  if (el.dataset.removeQuestion) {
    const qId = parseInt(el.dataset.removeQuestion, 10);
    try {
      const { usages } = await api('GET', `/api/schema/questions/${qId}/usage`);
      if (usages.length === 0) {
        if (!confirm('Remove this question? This cannot be undone.')) return;
      } else {
        const lines = usages.map(u => `• ${u.partnerName} — ${u.scope === 'general' ? 'General' : u.productName}`).join('\n');
        if (!confirm(`This question has already been answered in:\n\n${lines}\n\nRemoving it will permanently delete all of these answers too. Continue?`)) return;
        if (!confirm('Are you sure? This cannot be undone.')) return;
      }
      const result = await api('DELETE', `/api/schema/questions/${qId}`);
      State.schema.detailQuestions = State.schema.detailQuestions.filter(q => q.id !== qId);
      // Mirror the server's sweep in this partner's own in-memory copy too
      // — otherwise a later normal Save would PUT the stale answer right
      // back (same staleness risk Publish already solves the same way).
      State.detailPartner.generalAnswers = (State.detailPartner.generalAnswers || []).filter(a => a.qId !== qId);
      (State.detailPartner.products || []).forEach(prod => {
        prod.answers = (prod.answers || []).filter(a => a.qId !== qId);
      });
      markDirty();
      refreshDetailTabsAndPanels();
      await saveDetail();
      toast(`Question removed${result.answersRemoved ? ` — cleared ${result.answersRemoved} saved answer(s) across other partners` : ''}.`);
    } catch (err) {
      toast('Remove failed: ' + err.message, true);
    }
    return;
  }

  if (el.dataset.statusFilter !== undefined) {
    State.statusFilter = el.dataset.statusFilter;
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.priorityFilter !== undefined) {
    State.priorityFilter = el.dataset.priorityFilter;
    refreshDetailTabsAndPanels();
    return;
  }

  if (el.dataset.addFunction !== undefined) {
    const label = (prompt('New function name (e.g. "Surround View"):') || '').trim();
    if (!label) return;
    try {
      const result = await api('POST', '/api/schema/functions', { label });
      State.schema.productFunctions.push({ key: result.key, label: result.label });
      State.schema.detailSections.push(result.section);
      refreshDetailTabsAndPanels();
      toast(`Function "${result.label}" added — now available on every product across every partner.`);
    } catch (err) {
      toast('Add function failed: ' + err.message, true);
    }
    return;
  }
}

// ── Edit Meta modal ────────────────────────────────────────────────────────
function openEditMetaModal(p) {
  const overlay = document.getElementById('modal-add-partner');
  overlay.querySelector('.modal-title').textContent = 'Edit Partner Info';
  document.getElementById('new-partner-name').value = p.name || '';
  document.getElementById('new-partner-short').value = p.shortName || '';
  document.getElementById('new-partner-evaluator').value = p.evaluator || '';
  document.getElementById('new-partner-version').value = p.productVersion || '';
  document.getElementById('new-partner-stage').value = p.stage || 'Under Evaluation';
  openModal('modal-add-partner');

  // Re-wire confirm button to update meta
  const btn = document.getElementById('btn-confirm-add');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.textContent = 'Save';
  newBtn.addEventListener('click', () => {
    State.detailPartner.name = document.getElementById('new-partner-name').value.trim() || p.name;
    State.detailPartner.shortName = document.getElementById('new-partner-short').value.trim();
    State.detailPartner.evaluator = document.getElementById('new-partner-evaluator').value.trim();
    State.detailPartner.productVersion = document.getElementById('new-partner-version').value.trim();
    State.detailPartner.stage = document.getElementById('new-partner-stage').value;
    markDirty();
    closeModal('modal-add-partner');
    // Refresh info display
    document.getElementById('detail-name-display').textContent = State.detailPartner.name;
    document.getElementById('di-evaluator').textContent = State.detailPartner.evaluator || '—';
    document.getElementById('di-version').textContent = State.detailPartner.productVersion || '—';
    // Reset confirm button for add flow
    resetAddPartnerModal();
  });
}

function resetAddPartnerModal() {
  const overlay = document.getElementById('modal-add-partner');
  overlay.querySelector('.modal-title').textContent = 'Add New Partner';
  const btn = document.getElementById('btn-confirm-add');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.textContent = 'Add Partner';
  bindAddPartnerConfirm();
}

// ── Dirty state & save controls ───────────────────────────────────────────

function markDirty() {
  State.detailDirty = true;
  const indicator = document.getElementById('detail-dirty-indicator');
  const btnSave    = document.getElementById('btn-detail-save');
  const btnDiscard = document.getElementById('btn-detail-discard');
  const btnEdit    = document.getElementById('btn-detail-edit');
  if (indicator) indicator.style.display = '';
  if (btnSave)    btnSave.style.display   = '';
  if (btnDiscard) btnDiscard.style.display = '';
  if (btnEdit)    btnEdit.style.display    = 'none'; // Save/Discard take over while dirty
}

function clearDirty() {
  State.detailDirty = false;
  const indicator = document.getElementById('detail-dirty-indicator');
  const btnSave    = document.getElementById('btn-detail-save');
  const btnDiscard = document.getElementById('btn-detail-discard');
  if (indicator) indicator.style.display = 'none';
  if (btnSave)    btnSave.style.display   = 'none';
  if (btnDiscard) btnDiscard.style.display = 'none';
  refreshEditButtonLabel();
}

// Partner Detail is read-only until this button is clicked. Shown as
// "Edit" (not in edit mode) or "Done" (in edit mode, no unsaved changes --
// markDirty() above hides this in favor of Save/Discard once there's
// something to commit).
function refreshEditButtonLabel() {
  const btnEdit = document.getElementById('btn-detail-edit');
  if (!btnEdit) return;
  if (!State.detailPartner) { btnEdit.style.display = 'none'; return; }
  btnEdit.style.display = '';
  btnEdit.textContent = State.detailEditMode ? 'Done' : 'Edit';
}

async function saveDetail() {
  if (!State.detailPartner) return;

  // Clear dirty immediately so navigation guards don't fire while the
  // PUT is in flight. If the save fails we restore dirty state.
  clearDirty();

  const btnSave = document.getElementById('btn-detail-save');
  if (btnSave) { btnSave.style.display = ''; btnSave.textContent = 'Saving…'; btnSave.disabled = true; }

  try {
    await api('PUT', `/api/partners/${State.detailPartner.id}`, State.detailPartner);
    toast('Saved');
    await refreshPartnersSummary();
    const opt = document.querySelector(`#detail-partner-select option[value="${State.detailPartner.id}"]`);
    if (opt) opt.textContent = State.detailPartner.name;
    // Back to read-only after a successful save, same as a fresh load --
    // editing again requires clicking Edit, consistent everywhere.
    State.detailEditMode = false;
    renderDetailContent(State.detailPartner);
    refreshEditButtonLabel();
  } catch (e) {
    // Restore dirty so the user knows the save failed and can retry
    markDirty();
    toast('Save failed: ' + e.message, true);
  } finally {
    if (btnSave) { btnSave.textContent = 'Save'; btnSave.disabled = false; }
  }
}

async function discardDetail() {
  if (!State.detailPartner) return;
  const id = State.detailPartner.id;
  State.detailDirty = false;
  clearDirty();
  await loadDetailPartner(id);
  toast('Changes discarded');
}

// ── Unsaved-changes guard ──────────────────────────────────────────────────
// Returns a Promise that resolves to 'save' | 'discard' | 'cancel'
function askUnsavedModal(partnerName, action) {
  return new Promise(resolve => {
    const msg = document.getElementById('modal-unsaved-msg');
    if (msg) msg.textContent =
      `You have unsaved changes to "${partnerName}". What would you like to do before ${action}?`;

    openModal('modal-unsaved');

    const btnSave    = document.getElementById('btn-unsaved-save');
    const btnDiscard = document.getElementById('btn-unsaved-discard');
    const btnCancel  = document.getElementById('btn-unsaved-cancel');

    function cleanup() {
      closeModal('modal-unsaved');
      btnSave.onclick = btnDiscard.onclick = btnCancel.onclick = null;
    }
    btnSave.onclick    = () => { cleanup(); resolve('save');    };
    btnDiscard.onclick = () => { cleanup(); resolve('discard'); };
    btnCancel.onclick  = () => { cleanup(); resolve('cancel');  };
  });
}

// Call this before any navigation that would leave the current partner.
// Returns true if navigation should proceed.
async function guardNavigation(action) {
  if (!State.detailDirty) return true;
  const name = State.detailPartner ? State.detailPartner.name : 'this partner';
  const choice = await askUnsavedModal(name, action);
  if (choice === 'cancel') return false;
  if (choice === 'save') {
    await saveDetail();
    return !State.detailDirty; // if save failed, stay
  }
  // discard
  State.detailDirty = false;
  clearDirty();
  return true;
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Add Partner ────────────────────────────────────────────────────────────
function bindAddPartnerConfirm() {
  const btn = document.getElementById('btn-confirm-add');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const name = document.getElementById('new-partner-name').value.trim();
    if (!name) { toast('Company name is required', true); return; }
    const shortName = document.getElementById('new-partner-short').value.trim() ||
                      name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
    const payload = {
      name,
      shortName,
      evaluator: document.getElementById('new-partner-evaluator').value.trim(),
      productVersion: document.getElementById('new-partner-version').value.trim(),
      stage: document.getElementById('new-partner-stage').value,
    };
    try {
      const result = await api('POST', '/api/partners', payload);
      closeModal('modal-add-partner');
      toast(`Partner "${name}" added`);
      // Clear form
      ['new-partner-name','new-partner-short','new-partner-evaluator','new-partner-version'].forEach(id => {
        document.getElementById(id).value = '';
      });
      await refreshPartnersSummary();
      populateDetailSelect();
      openDetailFor(result.id);
    } catch (e) {
      toast('Failed to add partner: ' + e.message, true);
    }
  });
}

// ── Refresh data ───────────────────────────────────────────────────────────
async function refreshPartnersSummary() {
  State.partnersSummary = await api('GET', '/api/partners');
}

function populateDetailSelect() {
  const sel = document.getElementById('detail-partner-select');
  const current = sel.value;
  sel.innerHTML = '<option value="">Select partner…</option>' +
    State.partnersSummary.map(p => `<option value="${p.id}"${p.id === current ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
}

// ── Decision log full render with real data ────────────────────────────────
async function renderDecisionsFull() {
  // Need full partner data for decisions; use summary for now
  const table = document.getElementById('decision-table');
  const partners = State.partnersSummary;

  if (partners.length === 0) {
    table.innerHTML = `<tr><td colspan="5"><div class="empty-state">No partners yet.</div></td></tr>`;
    return;
  }

  // Fetch full details for decision fields
  const fullPartners = await Promise.all(
    partners.map(p => api('GET', `/api/partners/${p.id}`))
  );

  const rows = fullPartners.filter(p => (p.decision || {}).status);
  if (rows.length === 0) {
    table.innerHTML = `<tr><td colspan="5"><div class="empty-state">No decisions recorded yet. Set a decision status in the Partner Detail view.</div></td></tr>`;
    return;
  }

  table.innerHTML = `
    <thead><tr>
      <th>Partner</th>
      <th>Decision</th>
      <th>Reviewer</th>
      <th>Date</th>
      <th>Rationale</th>
    </tr></thead>
    <tbody>
    ${rows.map(p => {
      const d = p.decision || {};
      return `
        <tr>
          <td style="font-weight:600;color:var(--navy);cursor:pointer;" onclick="openDetailFor('${p.id}')">${esc(p.name)}</td>
          <td>${statusBadge(d.status)}</td>
          <td>${esc(d.reviewer || '—')}</td>
          <td>${esc(d.date || '—')}</td>
          <td class="rationale-text">${esc(d.rationale || '—')}</td>
        </tr>
      `;
    }).join('')}
    </tbody>
  `;
}

// ── Utility ────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  // Load schema
  State.schema = await api('GET', '/api/schema');

  // Load partners summary
  await refreshPartnersSummary();

  // Tab navigation — guard unsaved changes before switching away
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await guardNavigation('switching tabs');
      if (ok) switchTab(btn.dataset.tab);
    });
  });

  // Modals: close on overlay click or × button
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Add partner button
  document.getElementById('btn-add-partner').addEventListener('click', () => {
    openModal('modal-add-partner');
  });

  // Detail partner select — guard unsaved changes before switching partner
  document.getElementById('detail-partner-select').addEventListener('change', async e => {
    const nextId = e.target.value;
    const ok = await guardNavigation('switching partners');
    if (!ok) {
      // Revert the dropdown to the currently loaded partner
      e.target.value = State.detailPartner ? State.detailPartner.id : '';
      return;
    }
    await loadDetailPartner(nextId);
  });

  // Save / Discard buttons in Partner Detail header
  document.getElementById('btn-detail-save').addEventListener('click', saveDetail);
  document.getElementById('btn-detail-discard').addEventListener('click', async () => {
    if (!State.detailPartner) return;
    await discardDetail();
  });

  // Edit / Done toggle — Partner Detail is read-only until this is clicked
  document.getElementById('btn-detail-edit').addEventListener('click', () => {
    if (!State.detailPartner) return;
    State.detailEditMode = !State.detailEditMode;
    renderDetailContent(State.detailPartner);
    refreshEditButtonLabel();
  });

  // Browser close / refresh warning
  window.addEventListener('beforeunload', e => {
    if (State.detailDirty) {
      e.preventDefault();
      e.returnValue = ''; // required for Chrome
    }
  });

  // Wire add partner confirm
  bindAddPartnerConfirm();

  // Populate detail partner selector
  populateDetailSelect();

  // Initial render
  renderOverview();
}

document.addEventListener('DOMContentLoaded', boot);
