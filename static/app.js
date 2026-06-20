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
  activeDetailTab: 'general',
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
      label: d.label,
      sectionIds: (schema.detailSections || []).filter(s => s.domain === d.id).map(s => s.id),
    }))
    .filter(g => g.sectionIds.length > 0);
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
  `;

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
function computeGroupCompletion(partner, group) {
  let done = 0, total = 0;
  const sections = (State.schema.detailSections || []).filter(s => group.sectionIds.includes(s.id));
  sections.forEach(section => {
    const qIds = questionsForSection(section.id).map(q => q.id);
    if (section.category === 'general') {
      qIds.forEach(qId => {
        const a = (partner.generalAnswers || []).find(x => x.qId === qId);
        const status = a ? a.status : '';
        if (status === 'na') return;
        total++;
        if (status === 'accomplished' || status === 'verified') done++;
      });
    } else {
      (partner.products || []).forEach(prod => {
        const relevant = sectionScopeMatches(section, prod) || sectionHasAnswerData(section, prod);
        if (!relevant) return;
        qIds.forEach(qId => {
          const a = (prod.answers || []).find(x => x.qId === qId);
          const status = a ? a.status : '';
          if (status === 'na') return;
          total++;
          if (status === 'accomplished' || status === 'verified') done++;
        });
      });
    }
  });
  return { done, total };
}

function heatmapCellClass(pct, total) {
  if (total === 0) return 'hm-empty';
  if (pct >= 67) return 'hm-high';
  if (pct >= 34) return 'hm-mid';
  return 'hm-low';
}

function heatmapCellHtml(done, total) {
  if (total === 0) return `<td class="hm-cell hm-empty" title="No applicable questions">—</td>`;
  const pct = Math.round((done / total) * 100);
  return `<td class="hm-cell ${heatmapCellClass(pct, total)}" title="${done} / ${total} applicable questions">${pct}%</td>`;
}

async function renderComparison() {
  const body = document.getElementById('comparison-body');
  if (!body) return;
  const summary = State.partnersSummary;
  if (summary.length === 0) {
    body.innerHTML = `<div class="empty-state">No partners yet.</div>`;
    return;
  }
  body.innerHTML = `<div class="loading-wrap"><div class="spinner"></div></div>`;

  const fullPartners = await Promise.all(summary.map(p => api('GET', `/api/partners/${p.id}`)));
  const groups = comparisonGroups();

  const rows = fullPartners.map(p => {
    const groupResults = groups.map(g => computeGroupCompletion(p, g));
    const overallDone = groupResults.reduce((a, r) => a + r.done, 0);
    const overallTotal = groupResults.reduce((a, r) => a + r.total, 0);
    const overallPct = overallTotal === 0 ? -1 : Math.round((overallDone / overallTotal) * 100);
    return { partner: p, groupResults, overallDone, overallTotal, overallPct };
  });
  rows.sort((a, b) => b.overallPct - a.overallPct);

  body.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th class="hm-partner-col">Partner</th>
          ${groups.map(g => `<th>${esc(g.label)}</th>`).join('')}
          <th>Overall</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="hm-partner-name" data-open-partner="${r.partner.id}">${esc(r.partner.name)}</td>
            ${r.groupResults.map(gr => heatmapCellHtml(gr.done, gr.total)).join('')}
            ${heatmapCellHtml(r.overallDone, r.overallTotal)}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  body.querySelectorAll('[data-open-partner]').forEach(el => {
    el.addEventListener('click', () => openDetailFor(el.dataset.openPartner));
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
    <div class="detail-layout print-target">
      <!-- Sidebar -->
      <div class="detail-sidebar">
        <div class="card">
          <div class="card-header">
            <span class="card-title" id="detail-name-display">${esc(p.name)}</span>
            <button class="btn btn-secondary btn-sm" id="btn-edit-meta">Edit Info</button>
          </div>
          <div class="card-body">
            <div class="info-block">
              <div class="info-row"><span class="label">Evaluator</span><span class="value" id="di-evaluator">${esc(p.evaluator || '—')}</span></div>
              <div class="info-row"><span class="label">Product / Version</span><span class="value" id="di-version">${esc(p.productVersion || '—')}</span></div>
              <div class="info-row"><span class="label">Eval Date</span><span class="value" id="di-date">${esc(p.evaluationDate || '—')}</span></div>
              <div class="info-row"><span class="label">Stage</span><span class="value">
                <select class="q-score-select" id="di-stage" style="width:auto;font-size:.8125rem;" data-field="stage">
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
              <select class="form-select" id="di-decision-status" data-decision-field="status">
                <option value="">— select —</option>
                ${['Shortlisted','Hold','Rejected'].map(s =>
                  `<option value="${s}"${(p.decision||{}).status === s ? ' selected' : ''}>${s}</option>`
                ).join('')}
              </select>
              <span class="print-val">${esc((p.decision||{}).status || '')}</span>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Rationale</label>
              <textarea class="form-textarea" rows="4" id="di-decision-rationale" data-decision-field="rationale"
                placeholder="Describe the reasoning for this decision…">${esc((p.decision||{}).rationale || '')}</textarea>
              <div class="print-val">${esc((p.decision||{}).rationale || '')}</div>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Reviewer</label>
              <input class="form-input" id="di-decision-reviewer" type="text"
                value="${esc((p.decision||{}).reviewer || '')}" data-decision-field="reviewer" placeholder="Name / team" />
            </div>
            <div class="form-group">
              <label class="form-label">Decision Date</label>
              <input class="form-input" id="di-decision-date" type="date"
                value="${esc((p.decision||{}).date || '')}" data-decision-field="date" />
            </div>
          </div>
        </div>

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
  // heroSensors/heroFunctions: subset of checked sensors/functions marked as
  // this product's differentiating capabilities (there can be more than
  // one) -- used by the customer-meeting-prep view to elevate priority
  // regardless of a question's static tag. No UI to set these yet.
  return { id, name: 'Product ' + ordinal, sensors, functions, socs, sensorNotes, heroSensors: [], heroFunctions: [] };
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
  html += `<button class="btn btn-secondary btn-sm" data-add-product type="button">+ Add Product</button>`;
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
}

function answerStatusLabel(key) {
  const s = (State.schema.answerStatuses || []).find(x => x.key === key);
  return s ? s.label : '';
}

function answerRowHtml(q, ans, key) {
  const schema = State.schema;
  return `
    <div class="ans-row">
      <span class="q-num">${q.id}</span>
      <div class="q-text">${esc(q.text)}</div>
      <select class="q-score-select" data-ans-status="${key}">
        <option value="">— Select —</option>
        ${schema.answerStatuses.map(s => `<option value="${s.key}"${ans.status === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>
      <span class="print-val">${esc(answerStatusLabel(ans.status))}</span>
      <textarea class="q-remarks-input" rows="2" placeholder="Partner response…" data-ans-partner-response="${key}">${esc(ans.partnerResponse || '')}</textarea>
      <span class="print-val">${esc(ans.partnerResponse || '')}</span>
      <textarea class="q-remarks-input" rows="2" placeholder="L&amp;T remarks…" data-ans-remarks="${key}">${esc(ans.remarks || '')}</textarea>
      <span class="print-val">${esc(ans.remarks || '')}</span>
    </div>
  `;
}

function answerQuestionsTableHtml(title, questions, getAnswer, keyFor, inactiveNote) {
  return `
    <div class="card q-section-card">
      <div class="card-header" data-section-toggle-header>
        <span class="card-title">${esc(title)} <span class="accordion-chevron">&#9662;</span></span>
        ${inactiveNote ? `<span class="text-muted" style="font-size:.75rem;">${esc(inactiveNote)}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="ans-row q-table-header"><span>#</span><span>Question</span><span>Status</span><span>Partner Response</span><span>L&amp;T Remarks</span></div>
        ${questions.length === 0
          ? `<div class="text-muted" style="font-size:.8125rem;">No questions defined for this section yet.</div>`
          : questions.map(q => answerRowHtml(q, getAnswer(q.id), keyFor(q.id))).join('')}
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
  return questionsForSection(section.id).some(q => {
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
        const qIds = questionsForSection(section.id).map(q => q.id);
        prod.answers = (prod.answers || []).filter(a => !qIds.includes(a.qId));
      }
      if (hasNotes) prod.sensorNotes[key] = '';
    }
  }

  prod[field][key] = !prod[field][key];
  return true;
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
    ${sections.map(sec => answerQuestionsTableHtml(sec.label, questionsForSection(sec.id),
      qId => (p.generalAnswers || []).find(x => x.qId === qId) || { status: '', remarks: '' },
      qId => `general:${qId}`)).join('')}
  `;
}

function productTabHtml(prod) {
  const schema = State.schema;
  const sections = sectionsForProduct(prod);
  return `
    ${productCardHtml(prod, schema)}
    ${sections.map(({ section, active }) => answerQuestionsTableHtml(section.label, questionsForSection(section.id),
      qId => (prod.answers || []).find(x => x.qId === qId) || { status: '', remarks: '' },
      qId => `product:${prod.id}:${qId}`,
      active ? null : 'Sensor unchecked — kept visible because it has saved answers')).join('')}
  `;
}

function notesTabHtml(p) {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">General Notes</span></div>
      <div class="card-body">
        <textarea class="form-textarea" style="min-height:300px;" id="di-notes"
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
      <select class="form-select" data-patent-field="${pt.id}:relevanceKey">
        <option value="">— select sensor —</option>
        ${schema.productSensors.map(s => `<option value="${s.key}"${pt.relevanceKey === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
      </select>`;
  } else if (relevanceType === 'function') {
    relevanceControl = `
      <select class="form-select" data-patent-field="${pt.id}:relevanceKey">
        <option value="">— select function —</option>
        ${schema.productFunctions.map(f => `<option value="${f.key}"${pt.relevanceKey === f.key ? ' selected' : ''}>${esc(f.label)}</option>`).join('')}
      </select>`;
  } else if (relevanceType) {
    relevanceControl = `
      <input class="form-input" type="text" placeholder="What is this relevant to?"
        data-patent-field="${pt.id}:relevanceLabel" value="${esc(pt.relevanceLabel || '')}" />`;
  }

  return `
    <div class="card patent-card" data-patent-id="${pt.id}">
      <div class="card-header">
        <input class="form-input" style="font-weight:600;max-width:280px;"
          data-patent-field="${pt.id}:title" value="${esc(pt.title || '')}" />
        <button class="btn btn-danger btn-sm" data-remove-patent="${pt.id}" type="button">Remove</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div class="form-group">
            <label class="form-label">Patent ID / Application No.</label>
            <input class="form-input" type="text" placeholder="e.g. US17/123,456"
              data-patent-field="${pt.id}:patentId" value="${esc(pt.patentId || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" data-patent-field="${pt.id}:status">
              <option value="">— select —</option>
              ${schema.patentStatuses.map(s => `<option value="${s.key}"${pt.status === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Jurisdiction</label>
            <input class="form-input" type="text" placeholder="e.g. India, US, EU"
              data-patent-field="${pt.id}:jurisdiction" value="${esc(pt.jurisdiction || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Granted By</label>
            <input class="form-input" type="text" placeholder="e.g. USPTO, IPO India"
              data-patent-field="${pt.id}:grantedBy" value="${esc(pt.grantedBy || '')}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
          <div class="form-group">
            <label class="form-label">Relevant To</label>
            <select class="form-select" data-patent-relevance-type="${pt.id}">
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
          <textarea class="form-textarea" rows="2" placeholder="Notes…"
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
      <button class="btn btn-secondary btn-sm" data-add-patent type="button">+ Add Patent</button>
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

function productCardHtml(prod, schema) {
  return `
    <div class="card product-card" data-product-id="${prod.id}">
      <div class="card-header">
        <input class="form-input" style="font-weight:600;max-width:280px;"
          data-product-name="${prod.id}" value="${esc(prod.name || '')}" />
        <button class="btn btn-danger btn-sm" data-remove-product="${prod.id}" type="button">Remove</button>
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
            <textarea class="form-textarea" rows="2" placeholder="${esc(s.label)} spec / notes…"
              data-product-note="${prod.id}:${s.key}">${esc((prod.sensorNotes && prod.sensorNotes[s.key]) || '')}</textarea>
            <div class="print-val">${esc((prod.sensorNotes && prod.sensorNotes[s.key]) || '')}</div>
          </div>
        `;
        }).join('')}
        <div class="product-toggle-label" style="margin-top:14px;">Functions</div>
        <div class="toggle-pill-row" style="margin-bottom:8px;">
          ${schema.productFunctions.map(f => {
            const on = !!(prod.functions && prod.functions[f.key]);
            return `<span class="toggle-pill${on ? ' on' : ''}" data-toggle-function="${prod.id}:${f.key}">${esc(f.label)}</span>`;
          }).join('')}
        </div>
        <div class="product-toggle-label" style="margin-top:14px;">SoCs</div>
        <div class="toggle-pill-row">
          ${(schema.productSocs || []).map(c => {
            const on = !!(prod.socs && prod.socs[c.key]);
            return `<span class="toggle-pill${on ? ' on' : ''}" data-toggle-soc="${prod.id}:${c.key}">${esc(c.label)}</span>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function handleDetailClick(e) {
  // Collapsible question-table sections — click the heading to toggle.
  // Checked first since the header sits outside the other data-* targets.
  const sectionHeader = e.target.closest('[data-section-toggle-header]');
  if (sectionHeader) {
    const card = sectionHeader.closest('.q-section-card');
    if (card) card.classList.toggle('collapsed');
    return;
  }

  const el = e.target.closest('[data-business-model],[data-add-product],[data-remove-product],[data-toggle-sensor],[data-toggle-function],[data-toggle-soc],[data-add-patent],[data-remove-patent]');
  if (!el) return;

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
  if (indicator) indicator.style.display = '';
  if (btnSave)    btnSave.style.display   = '';
  if (btnDiscard) btnDiscard.style.display = '';
}

function clearDirty() {
  State.detailDirty = false;
  const indicator = document.getElementById('detail-dirty-indicator');
  const btnSave    = document.getElementById('btn-detail-save');
  const btnDiscard = document.getElementById('btn-detail-discard');
  if (indicator) indicator.style.display = 'none';
  if (btnSave)    btnSave.style.display   = 'none';
  if (btnDiscard) btnDiscard.style.display = 'none';
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
