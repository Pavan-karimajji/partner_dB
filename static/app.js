'use strict';
/* ──────────────────────────────────────────────────────────────────────────
   L&T EPS — ADAS Partner Evaluation Dashboard
   Vanilla JS, no build step required.
   ──────────────────────────────────────────────────────────────────────── */

// ── State ──────────────────────────────────────────────────────────────────
const State = {
  schema: null,
  partnersSummary: [],   // lightweight list (from GET /api/partners)
  detailPartner: null,   // full partner object loaded for detail view
  detailDirty: false,
  radarChart: null,
  barChart: null,
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

// ── Score helpers ─────────────────────────────────────────────────────────
function scoreClass(s) {
  if (s === null || s === undefined) return 'score-na';
  if (s >= 5) return 'score-5';
  if (s >= 4) return 'score-4';
  if (s >= 3) return 'score-3';
  if (s >= 2) return 'score-2';
  return 'score-1';
}

function scoreCell(s) {
  const label = s != null ? s : 'N/A';
  return `<span class="score-cell ${scoreClass(s)}">${label}</span>`;
}

function verdictBadge(v) {
  const map = {
    'Approved':               'badge-approved',
    'Conditionally Approved': 'badge-conditional',
    'Not Approved':           'badge-not-approved',
    'Pending':                'badge-pending',
  };
  return `<span class="badge ${map[v] || 'badge-pending'}">${v || 'Pending'}</span>`;
}

function statusBadge(s) {
  const map = {
    'Shortlisted': 'badge-shortlisted',
    'Hold':        'badge-hold',
    'Rejected':    'badge-rejected',
  };
  if (!s) return '';
  return `<span class="badge ${map[s] || 'badge-pending'}">${s}</span>`;
}

function barFill(score) {
  if (score == null) return 0;
  return Math.round((score / 5) * 100);
}

// ── Weighted score from section scores array ───────────────────────────────
function computeWeightedScore(sectionScores) {
  if (!State.schema || !sectionScores) return null;
  const sections = State.schema.techSections;
  const totalWeight = sections.reduce((a, s) => a + s.weight, 0);
  let wsum = 0, hasAny = false;
  for (const ss of sectionScores) {
    if (ss.score == null) continue;
    hasAny = true;
    const def = sections.find(s => s.id === ss.sectionId);
    if (def) wsum += (ss.score / 5) * def.weight;
  }
  if (!hasAny) return null;
  return Math.round((wsum / totalWeight) * 5 * 100) / 100;
}

function deriveVerdict(wav) {
  if (wav == null) return 'Pending';
  const t = State.schema.verdictThresholds;
  if (wav >= t.approved)    return 'Approved';
  if (wav >= t.conditional) return 'Conditionally Approved';
  return 'Not Approved';
}

// ── Overview ───────────────────────────────────────────────────────────────
function renderOverview() {
  const partners = State.partnersSummary;

  // Stats
  const stats = document.getElementById('overview-stats');
  const totalWeight = State.schema.techSections.reduce((a, s) => a + s.weight, 0);
  const scored = partners.filter(p => p.weightedScore != null).length;
  const shortlisted = partners.filter(p => p.decisionStatus === 'Shortlisted').length;
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Partners</div>
      <div class="stat-value">${partners.length}</div>
      <div class="stat-sub">under evaluation</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Scored</div>
      <div class="stat-value">${scored}</div>
      <div class="stat-sub">of ${partners.length} have a score</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Shortlisted</div>
      <div class="stat-value">${shortlisted}</div>
      <div class="stat-sub">decision pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Questions</div>
      <div class="stat-value">${State.schema.techQuestions.length}</div>
      <div class="stat-sub">across ${State.schema.techSections.length} sections</div>
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
  const wav = p.weightedScore;
  const pct = wav != null ? barFill(wav) : 0;
  const scoreLabel = wav != null ? wav.toFixed(1) + ' / 5' : 'Not scored';
  return `
    <div class="partner-card" data-id="${p.id}">
      <div class="partner-card-name">${esc(p.name)}</div>
      <div class="partner-card-sub">${esc(p.evaluator || '')}${p.evaluationDate ? ' · ' + p.evaluationDate : ''}</div>
      <div class="partner-card-score">
        <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${pct}%"></div></div>
        <span class="score-label">${scoreLabel}</span>
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
        ${verdictBadge(p.verdict)}
        ${p.decisionStatus ? statusBadge(p.decisionStatus) : ''}
      </div>
    </div>
  `;
}

// ── Comparison ─────────────────────────────────────────────────────────────
function renderComparison() {
  const partners = State.partnersSummary;
  const sections = State.schema.techSections;

  if (partners.length === 0) {
    document.getElementById('comparison-table').innerHTML =
      '<tr><td colspan="20"><div class="empty-state">No partners yet. Add one to get started.</div></td></tr>';
    return;
  }

  // Radar chart
  const radarLabels = sections.map(s => shortSectionName(s.name));
  const radarDatasets = partners.map((p, i) => {
    const data = sections.map(sec => {
      const ss = p.sectionScores.find(x => x.sectionId === sec.id);
      return ss && ss.score != null ? ss.score : 0;
    });
    return {
      label: p.name,
      data,
      borderColor: COLORS.chartPalette[i % COLORS.chartPalette.length],
      backgroundColor: hexAlpha(COLORS.chartPalette[i % COLORS.chartPalette.length], 0.08),
      pointBackgroundColor: COLORS.chartPalette[i % COLORS.chartPalette.length],
      borderWidth: 2,
      pointRadius: 3,
    };
  });

  if (State.radarChart) State.radarChart.destroy();
  State.radarChart = new Chart(document.getElementById('radar-chart'), {
    type: 'radar',
    data: { labels: radarLabels, datasets: radarDatasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 5,
          ticks: { stepSize: 1, font: { size: 10 } },
          pointLabels: { font: { size: 10 }, color: COLORS.navy },
          grid: { color: 'rgba(0,0,0,.07)' },
        }
      },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
    }
  });

  // Bar chart — weighted scores
  const barDataset = {
    label: 'Weighted Score',
    data: partners.map(p => p.weightedScore ?? 0),
    backgroundColor: partners.map((_, i) => COLORS.chartPalette[i % COLORS.chartPalette.length]),
    borderRadius: 4,
  };
  if (State.barChart) State.barChart.destroy();
  State.barChart = new Chart(document.getElementById('bar-chart'), {
    type: 'bar',
    data: { labels: partners.map(p => p.name), datasets: [barDataset] },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,.05)' } },
        y: { ticks: { font: { size: 11 } } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x.toFixed(2)} / 5 — ${deriveVerdict(ctx.parsed.x)}`
          }
        }
      }
    }
  });

  // Score matrix table
  const table = document.getElementById('comparison-table');
  const thead = `<thead><tr>
    <th style="min-width:180px;">Section</th>
    <th>Weight</th>
    ${partners.map(p => `<th>${esc(p.name)}</th>`).join('')}
  </tr></thead>`;

  const tbody = `<tbody>
    ${sections.map(sec => `
      <tr>
        <td>${esc(sec.name)}</td>
        <td class="text-muted">${sec.weight}%</td>
        ${partners.map(p => {
          const ss = p.sectionScores.find(x => x.sectionId === sec.id);
          return `<td>${scoreCell(ss ? ss.score : null)}</td>`;
        }).join('')}
      </tr>
    `).join('')}
    <tr style="border-top:2px solid var(--gray-300);">
      <td style="font-weight:700;color:var(--navy);">Weighted Average</td>
      <td></td>
      ${partners.map(p => `<td>${p.weightedScore != null ? `<strong>${p.weightedScore.toFixed(2)}</strong>` : '—'}</td>`).join('')}
    </tr>
    <tr>
      <td style="font-weight:700;color:var(--navy);">Verdict</td>
      <td></td>
      ${partners.map(p => `<td>${verdictBadge(p.verdict)}</td>`).join('')}
    </tr>
  </tbody>`;

  table.innerHTML = thead + tbody;
}

function shortSectionName(name) {
  const map = {
    'Company & Product Maturity':            'Company',
    'System Architecture':                   'Architecture',
    'Camera & Sensor Subsystem':             'Camera/Sensor',
    'Validation & Test Infrastructure':      'Validation',
    'Functional Safety (ISO 26262 / SOTIF)': 'Safety',
    'Cybersecurity (ISO 21434)':             'Cybersecurity',
    'Production Readiness & Lifecycle':      'Production',
    'Software Quality & Reliability':        'SW Quality',
    'HMI & Driver Interaction':              'HMI',
    'Regional & Regulatory Compliance':      'Compliance',
    'EMC, Environmental & Reliability':      'EMC/Env',
  };
  return map[name] || name;
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
    clearDirty();
    renderDetailContent(partner);
  } catch (e) {
    toast('Failed to load partner: ' + e.message, true);
  }
}

function renderDetailContent(p) {
  const schema = State.schema;
  const wav = p.weightedScore;
  const verdict = p.verdict || deriveVerdict(wav);

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
            <div class="big-score">
              <div class="big-score-value">${wav != null ? wav.toFixed(2) : '—'}<span class="big-score-max">/5</span></div>
              <div class="big-score-label">Weighted Score</div>
              <div style="margin-top:10px;">${verdictBadge(verdict)}</div>
            </div>
            <div class="info-block">
              <div class="info-row"><span class="label">Evaluator</span><span class="value" id="di-evaluator">${esc(p.evaluator || '—')}</span></div>
              <div class="info-row"><span class="label">Product / Version</span><span class="value" id="di-version">${esc(p.productVersion || '—')}</span></div>
              <div class="info-row"><span class="label">Eval Date</span><span class="value" id="di-date">${esc(p.evaluationDate || '—')}</span></div>
              <div class="info-row"><span class="label">Stage</span><span class="value">
                <select class="q-score-select" id="di-stage" style="width:auto;font-size:.8125rem;" data-field="stage">
                  ${STAGES.map(s => `<option value="${s}"${p.stage === s ? ' selected' : ''}>${s}</option>`).join('')}
                </select>
              </span></div>
            </div>
          </div>
        </div>

        <!-- Section scores summary -->
        <div class="card">
          <div class="card-header"><span class="card-title">Section Scores</span></div>
          <div class="card-body" style="padding-top:8px;padding-bottom:8px;">
            ${schema.techSections.map(sec => {
              const ss = p.techScores.find(x => x.sectionId === sec.id);
              const score = ss ? ss.score : null;
              return `
                <div class="section-score-row" data-section-id="${sec.id}">
                  <div class="section-name">${esc(shortSectionName(sec.name))}</div>
                  <div class="section-weight">${sec.weight}%</div>
                  <div class="section-bar-wrap">
                    <div class="section-bar-fill" style="width:${barFill(score)}%"></div>
                  </div>
                  ${scoreCell(score)}
                </div>
              `;
            }).join('')}
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
            </div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label">Rationale</label>
              <textarea class="form-textarea" rows="4" id="di-decision-rationale" data-decision-field="rationale"
                placeholder="Describe the reasoning for this decision…">${esc((p.decision||{}).rationale || '')}</textarea>
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

      <!-- Main content: tabs for Technical / Perception -->
      <div class="detail-main">
        <div style="display:flex;gap:8px;border-bottom:2px solid var(--gray-200);padding-bottom:0;margin-bottom:20px;">
          <button class="topnav-tab active" style="color:var(--navy);background:transparent;" data-detail-tab="technical">Technical Evaluation</button>
          <button class="topnav-tab"        style="color:var(--navy);background:transparent;" data-detail-tab="perception">Perception & Function</button>
          <button class="topnav-tab"        style="color:var(--navy);background:transparent;" data-detail-tab="notes">Notes</button>
        </div>

        <!-- Technical Evaluation -->
        <div id="detail-tab-technical">
          ${schema.techSections.map(sec => {
            const ss = p.techScores.find(x => x.sectionId === sec.id) || {score: null, remarks: '', questions: []};
            const qList = schema.techQuestions.filter(q => q.sectionId === sec.id);
            return `
              <div class="accordion-item" data-section-id="${sec.id}">
                <div class="accordion-header" data-accordion>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span class="accordion-title">${esc(sec.name)}</span>
                    <span class="text-muted" style="font-size:.75rem;">${sec.weight}% weight</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;">
                    ${scoreCell(ss.score)}
                    <span class="accordion-chevron">▾</span>
                  </div>
                </div>
                <div class="accordion-body">
                  <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;padding:10px;background:var(--light-blue);border-radius:var(--radius);">
                    <label style="font-size:.8125rem;font-weight:600;color:var(--navy);">Section Score:</label>
                    <select class="q-score-select" style="width:auto;"
                      data-section-score="${sec.id}">
                      <option value="">— N/A —</option>
                      ${[1,2,3,4,5].map(n => `<option value="${n}"${ss.score == n ? ' selected' : ''}>${n} — ${schema.scoreLabels[n]}</option>`).join('')}
                    </select>
                    <label style="font-size:.8125rem;font-weight:600;color:var(--navy);margin-left:12px;">Remarks:</label>
                    <input class="q-remarks-input" style="flex:1;" placeholder="Section-level remarks…"
                      data-section-remarks="${sec.id}" value="${esc(ss.remarks || '')}" />
                  </div>
                  <div style="font-size:.75rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;display:grid;grid-template-columns:28px 1fr 90px 100px;gap:10px;padding:0 0 6px;border-bottom:1px solid var(--gray-200);">
                    <span>#</span><span>Question</span><span>Score</span><span>Remarks</span>
                  </div>
                  ${qList.map(q => {
                    const qd = (ss.questions || []).find(x => x.qId === q.id) || {};
                    return `
                      <div class="q-row">
                        <span class="q-num">${q.id}</span>
                        <div class="q-text" title="${esc(q.criteria || '')}">${esc(q.text)}${q.criteria ? `<div class="text-muted" style="font-size:.73rem;margin-top:2px;">${esc(q.criteria)}</div>` : ''}</div>
                        <select class="q-score-select" data-q-score="${sec.id}:${q.id}">
                          <option value="">N/A</option>
                          ${[1,2,3,4,5].map(n => `<option value="${n}"${qd.score == n ? ' selected' : ''}>${n}</option>`).join('')}
                        </select>
                        <input class="q-remarks-input" placeholder="Remarks…"
                          data-q-remarks="${sec.id}:${q.id}" value="${esc(qd.remarks || '')}" />
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Perception & Function -->
        <div id="detail-tab-perception" style="display:none;">
          ${schema.perceptionSections.map(psec => {
            const pr = p.perceptionResponses.find(x => x.sectionId === psec.id) || {questions: []};
            return `
              <div class="accordion-item" data-psection-id="${psec.id}">
                <div class="accordion-header" data-accordion>
                  <span class="accordion-title">${esc(psec.name)}</span>
                  <span class="accordion-chevron">▾</span>
                </div>
                <div class="accordion-body">
                  ${psec.questions.map(q => {
                    const qd = (pr.questions || []).find(x => x.qId === q.id) || {};
                    return `
                      <div class="p-row">
                        <div class="p-question"><strong>${q.id}. ${esc(q.sectionTag ? '[' + q.sectionTag + '] ' : '')}${esc(q.text)}</strong></div>
                        <textarea class="p-response-area" placeholder="Partner response / L&T notes…"
                          data-p-response="${psec.id}:${q.id}">${esc(qd.response || '')}</textarea>
                        <div class="p-judgement-row">
                          <span class="p-judgement-label">L&T Judgement:</span>
                          <select class="p-judgement-select" data-p-judgement="${psec.id}:${q.id}">
                            ${['TBD','Pass','Acceptable','Flag','Fail'].map(j =>
                              `<option value="${j}"${(qd.judgement || 'TBD') === j ? ' selected' : ''}>${j}</option>`
                            ).join('')}
                          </select>
                          <span class="p-judgement-label" style="margin-left:12px;">L&T Remark:</span>
                          <input class="q-remarks-input" style="flex:1;" placeholder="Internal remark…"
                            data-p-remark="${psec.id}:${q.id}" value="${esc(qd.lntRemark || '')}" />
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Notes -->
        <div id="detail-tab-notes" style="display:none;">
          <div class="card">
            <div class="card-header"><span class="card-title">General Notes</span></div>
            <div class="card-body">
              <textarea class="form-textarea" style="min-height:300px;" id="di-notes"
                placeholder="Any general notes, meeting summaries, open questions…">${esc(p.notes || '')}</textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind detail tab switching
  content.querySelectorAll('[data-detail-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('[data-detail-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['technical','perception','notes'].forEach(t => {
        const el = document.getElementById('detail-tab-' + t);
        if (el) el.style.display = t === btn.dataset.detailTab ? '' : 'none';
      });
    });
  });

  // Accordion
  content.querySelectorAll('[data-accordion]').forEach(h => {
    h.addEventListener('click', () => h.classList.toggle('open'));
  });

  // Open first accordion by default
  const firstAcc = content.querySelector('[data-accordion]');
  if (firstAcc) firstAcc.classList.add('open');

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

  // Stage dropdown
  document.getElementById('di-stage').addEventListener('change', e => {
    markDirty();
    State.detailPartner.stage = e.target.value;
  });

  // Decision fields
  content.querySelectorAll('[data-decision-field]').forEach(el => {
    el.addEventListener('input', e => {
      markDirty();
      if (!State.detailPartner.decision) State.detailPartner.decision = {};
      State.detailPartner.decision[el.dataset.decisionField] = el.value;
    });
    el.addEventListener('change', e => {
      markDirty();
      if (!State.detailPartner.decision) State.detailPartner.decision = {};
      State.detailPartner.decision[el.dataset.decisionField] = el.value;
    });
  });

  // Edit meta button
  document.getElementById('btn-edit-meta').addEventListener('click', () => {
    openEditMetaModal(p);
  });
}

function handleDetailChange(e) {
  const el = e.target;

  // Section score
  if (el.dataset.sectionScore) {
    markDirty();
    const sid = parseInt(el.dataset.sectionScore);
    const ss = ensureSectionScore(sid);
    ss.score = el.value ? parseInt(el.value) : null;
    // Update sidebar score cell
    refreshSidebarScores();
    return;
  }

  // Section remarks
  if (el.dataset.sectionRemarks) {
    markDirty();
    const sid = parseInt(el.dataset.sectionRemarks);
    ensureSectionScore(sid).remarks = el.value;
    return;
  }

  // Question score
  if (el.dataset.qScore) {
    markDirty();
    const [sidStr, qidStr] = el.dataset.qScore.split(':');
    const sid = parseInt(sidStr), qid = parseInt(qidStr);
    const ss = ensureSectionScore(sid);
    const qd = ensureQuestion(ss, qid);
    qd.score = el.value ? parseInt(el.value) : null;
    return;
  }

  // Question remarks
  if (el.dataset.qRemarks) {
    markDirty();
    const [sidStr, qidStr] = el.dataset.qRemarks.split(':');
    const sid = parseInt(sidStr), qid = parseInt(qidStr);
    const ss = ensureSectionScore(sid);
    ensureQuestion(ss, qid).remarks = el.value;
    return;
  }

  // Perception response
  if (el.dataset.pResponse) {
    markDirty();
    const [psid, qidStr] = el.dataset.pResponse.split(':');
    const qid = parseInt(qidStr);
    ensurePerceptionResponse(psid, qid).response = el.value;
    return;
  }

  // Perception judgement
  if (el.dataset.pJudgement) {
    markDirty();
    const [psid, qidStr] = el.dataset.pJudgement.split(':');
    ensurePerceptionResponse(psid, parseInt(qidStr)).judgement = el.value;
    return;
  }

  // Perception remark
  if (el.dataset.pRemark) {
    markDirty();
    const [psid, qidStr] = el.dataset.pRemark.split(':');
    ensurePerceptionResponse(psid, parseInt(qidStr)).lntRemark = el.value;
    return;
  }

  // Notes
  if (el.id === 'di-notes') {
    markDirty();
    State.detailPartner.notes = el.value;
    return;
  }
}

function ensureSectionScore(sectionId) {
  let ss = State.detailPartner.techScores.find(x => x.sectionId === sectionId);
  if (!ss) {
    ss = { sectionId, score: null, remarks: '', questions: [] };
    State.detailPartner.techScores.push(ss);
  }
  if (!ss.questions) ss.questions = [];
  return ss;
}

function ensureQuestion(ss, qId) {
  let qd = ss.questions.find(x => x.qId === qId);
  if (!qd) {
    qd = { qId, score: null, applicability: 'Applicable', remarks: '' };
    ss.questions.push(qd);
  }
  return qd;
}

function ensurePerceptionResponse(psectionId, qId) {
  let pr = State.detailPartner.perceptionResponses.find(x => x.sectionId === psectionId);
  if (!pr) {
    pr = { sectionId: psectionId, questions: [] };
    State.detailPartner.perceptionResponses.push(pr);
  }
  if (!pr.questions) pr.questions = [];
  let qd = pr.questions.find(x => x.qId === qId);
  if (!qd) {
    qd = { qId, response: '', lntRemark: '', judgement: 'TBD' };
    pr.questions.push(qd);
  }
  return qd;
}

function refreshSidebarScores() {
  const sidebar = document.querySelector('.detail-sidebar');
  if (!sidebar) return;
  State.schema.techSections.forEach(sec => {
    const ss = State.detailPartner.techScores.find(x => x.sectionId === sec.id);
    const score = ss ? ss.score : null;
    const row = sidebar.querySelector('.section-score-row[data-section-id="' + sec.id + '"]');
    if (row) {
      row.querySelector('.section-bar-fill').style.width = barFill(score) + '%';
      const cell = row.querySelector('.score-cell');
      if (cell) {
        cell.className = 'score-cell ' + scoreClass(score);
        cell.textContent = score != null ? score : 'N/A';
      }
    }
  });
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

// ── Decision Log ───────────────────────────────────────────────────────────
function renderDecisions() {
  const partners = State.partnersSummary;
  const table = document.getElementById('decision-table');

  const rows = partners.filter(p => p.decisionStatus || p.verdict !== 'Pending');
  if (rows.length === 0) {
    table.innerHTML = `<tr><td><div class="empty-state">No decisions recorded yet. Score partners and set a decision status in the Partner Detail view.</div></td></tr>`;
    return;
  }

  table.innerHTML = `
    <thead><tr>
      <th>Partner</th>
      <th>Weighted Score</th>
      <th>Auto Verdict</th>
      <th>Decision</th>
      <th>Reviewer</th>
      <th>Date</th>
      <th>Rationale</th>
    </tr></thead>
    <tbody>
    ${partners.map(p => {
      const summary = State.partnersSummary.find(x => x.id === p.id) || {};
      return `
        <tr>
          <td style="font-weight:600;color:var(--navy);cursor:pointer;" onclick="openDetailFor('${p.id}')">${esc(p.name)}</td>
          <td>${p.weightedScore != null ? p.weightedScore.toFixed(2) : '—'}</td>
          <td>${verdictBadge(p.verdict)}</td>
          <td>${p.decisionStatus ? statusBadge(p.decisionStatus) : '—'}</td>
          <td>${esc(p.decisionStatus ? '—' : '')}</td>
          <td>—</td>
          <td class="rationale-text">—</td>
        </tr>
      `;
    }).join('')}
    </tbody>
  `;
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
    table.innerHTML = `<tr><td colspan="7"><div class="empty-state">No partners yet.</div></td></tr>`;
    return;
  }

  // Fetch full details for decision fields
  const fullPartners = await Promise.all(
    partners.map(p => api('GET', `/api/partners/${p.id}`))
  );

  table.innerHTML = `
    <thead><tr>
      <th>Partner</th>
      <th>Score</th>
      <th>Auto Verdict</th>
      <th>Decision</th>
      <th>Reviewer</th>
      <th>Date</th>
      <th>Rationale</th>
    </tr></thead>
    <tbody>
    ${fullPartners.map(p => {
      const d = p.decision || {};
      return `
        <tr>
          <td style="font-weight:600;color:var(--navy);cursor:pointer;" onclick="openDetailFor('${p.id}')">${esc(p.name)}</td>
          <td>${p.weightedScore != null ? p.weightedScore.toFixed(2) : '—'}</td>
          <td>${verdictBadge(p.verdict)}</td>
          <td>${d.status ? statusBadge(d.status) : '—'}</td>
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
