/* ══════════════════════════════════════════
   FX JOURNAL — journal.js
   localStorage · Chart.js 4
══════════════════════════════════════════ */

const STORAGE_KEY   = 'fxjournal_juanes_v1';
const AVAILABLE_TAGS = [
  'High confluence','Breakout','Pullback','ICT','SMC',
  'VWAP','News','Revenge','FOMO','Planned','Patient','Overlevered'
];

/* ── State ── */
let trades       = [];
let selectedTags = [];
let charts       = {};

/* ══ STORAGE ══ */
function saveData()  { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)); }
function loadData()  {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    trades = raw ? JSON.parse(raw) : [];
  } catch(e) { trades = []; }
}

/* ══ HELPERS ══ */
function todayStr() { return new Date().toISOString().split('T')[0]; }

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${String(y).slice(2)}`;
}

function fmtPnl(n, dec = 2) {
  return (n >= 0 ? '+' : '') + parseFloat(n).toFixed(dec);
}

function getBalance() {
  if (!trades.length) return 10000;
  const sorted = [...trades].sort((a, b) => (a.date > b.date ? 1 : -1));
  const last   = sorted[sorted.length - 1];
  return last.balance + last.pnl;
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

/* ══ NAVIGATION ══ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (name === 'analytics') renderAnalytics();
}

document.getElementById('btn-go-analytics').addEventListener('click', () => showPage('analytics'));
document.getElementById('btn-go-journal').addEventListener('click',   () => showPage('journal'));

/* ══════════════════════════════
   JOURNAL PAGE
══════════════════════════════ */

/* ── Stats ── */
function renderStats() {
  const total  = trades.reduce((s, t) => s + t.pnl, 0);
  const wins   = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const wr     = trades.length ? Math.round(wins.length / trades.length * 100) : 0;
  const avgWin = wins.length
    ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const pf     = avgLoss > 0
    ? (avgWin * wins.length / (avgLoss * losses.length)).toFixed(2) : '—';
  const bal    = getBalance();

  document.getElementById('stats-row').innerHTML = `
    <div class="sc">
      <div class="sc-label">Balance</div>
      <div class="sc-val w">$${bal.toFixed(2)}</div>
      <div class="sc-sub">${trades.length} trades</div>
    </div>
    <div class="sc">
      <div class="sc-label">Net P&L</div>
      <div class="sc-val ${total >= 0 ? 'g' : 'r'}">${fmtPnl(total)}</div>
      <div class="sc-sub">${total >= 0 ? 'profit' : 'loss'}</div>
    </div>
    <div class="sc">
      <div class="sc-label">Win rate</div>
      <div class="sc-val ${wr >= 50 ? 'g' : 'r'}">${wr}%</div>
      <div class="sc-sub">${wins.length}W · ${losses.length}L</div>
    </div>
    <div class="sc">
      <div class="sc-label">Avg win</div>
      <div class="sc-val g">${avgWin > 0 ? fmtPnl(avgWin) : '—'}</div>
      <div class="sc-sub">avg loss: ${avgLoss > 0 ? '-$' + avgLoss.toFixed(2) : '—'}</div>
    </div>
    <div class="sc">
      <div class="sc-label">Profit factor</div>
      <div class="sc-val ${parseFloat(pf) >= 1 ? 'g' : 'r'}">${pf}</div>
      <div class="sc-sub">ratio</div>
    </div>
  `;

  document.getElementById('acct-pill').textContent = `Juanes · $${bal.toFixed(2)}`;
}

/* ── Table ── */
function getFiltered() {
  const q = (document.getElementById('search-inp').value || '').toLowerCase();
  return [...trades]
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .filter(t =>
      !q ||
      t.pair.toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tg => tg.toLowerCase().includes(q))
    );
}

function renderTable() {
  const tbody    = document.getElementById('trades-tbody');
  const filtered = getFiltered();

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="12">Sin trades registrados. Haz clic en "+ Nueva operación" para empezar.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const idx  = trades.indexOf(t);
    const pct  = t.balance ? ((t.pnl / t.balance) * 100).toFixed(2) : '—';
    const tags = (t.tags || []).map(tg => `<span class="tag-chip">${tg}</span>`).join('');
    return `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>
          <div class="pair-cell">
            <span>${t.pair}</span>
            <span class="dir-badge ${t.dir.toLowerCase()}">${t.dir}</span>
          </div>
        </td>
        <td style="color:var(--text-muted);font-size:11px">${t.session || '—'}</td>
        <td>${t.entry  || '—'}</td>
        <td>${t.exit   || '—'}</td>
        <td>${t.lots   || '—'}</td>
        <td class="${t.pnl >= 0 ? 'pnl-g' : 'pnl-r'}">${fmtPnl(t.pnl)}</td>
        <td class="${t.pnl >= 0 ? 'pnl-g' : 'pnl-r'}">
          ${pct !== '—' ? (t.pnl >= 0 ? '+' : '') + pct + '%' : '—'}
        </td>
        <td style="color:var(--text-muted)">${t.rr || '—'}</td>
        <td>${tags}</td>
        <td class="note-cell">${t.note || ''}</td>
        <td><button class="del-btn" onclick="deleteTrade(${idx})" title="Eliminar">✕</button></td>
      </tr>`;
  }).join('');
}

/* ── Equity mini chart ── */
function renderEquity() {
  destroyChart('equity');
  const sorted = [...trades].sort((a, b) => (a.date > b.date ? 1 : -1));
  if (!sorted.length) return;

  const labels = [], data = [];
  let bal = sorted[0].balance || 10000;
  sorted.forEach(t => {
    bal += t.pnl;
    labels.push(fmtDate(t.date));
    data.push(parseFloat(bal.toFixed(2)));
  });

  const isUp = data[data.length - 1] >= data[0];
  const ctx  = document.getElementById('equity-canvas').getContext('2d');

  charts.equity = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor:      isUp ? '#22c55e' : '#ef4444',
        borderWidth:      1.5,
        pointRadius:      data.length > 20 ? 0 : 2.5,
        pointBackgroundColor: isUp ? '#22c55e' : '#ef4444',
        fill:    false,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => '$' + c.parsed.y.toFixed(2) } }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid:  { color: '#1a1d25' },
          ticks: { color: '#4a4f66', font: { size: 9 }, callback: v => '$' + v }
        }
      }
    }
  });
}

/* ── Day breakdown ── */
function renderDayBreakdown() {
  const days   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const dayMap = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 };
  const sums   = new Array(7).fill(0);

  trades.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    sums[dayMap[d.getDay()]] += t.pnl;
  });

  const max = Math.max(...sums.map(Math.abs), 1);
  document.getElementById('day-breakdown').innerHTML = days.map((d, i) => {
    const v   = sums[i];
    const pct = Math.abs(v) / max * 100;
    const col = v >= 0 ? '#22c55e' : '#ef4444';
    return `
      <div class="day-row">
        <span class="day-label">${d}</span>
        <div class="day-bar-bg">
          <div class="day-bar" style="width:${pct}%;background:${col}"></div>
        </div>
        <span class="day-val" style="color:${v === 0 ? 'var(--text-muted)' : col}">
          ${v === 0 ? '—' : (v > 0 ? '+' : '') + '$' + v.toFixed(2)}
        </span>
      </div>`;
  }).join('');
}

function renderJournalAll() {
  renderStats();
  renderTable();
  renderEquity();
  renderDayBreakdown();
}

/* ── Search ── */
document.getElementById('search-inp').addEventListener('input', renderTable);

/* ── Delete trade ── */
window.deleteTrade = function(idx) {
  if (!confirm('¿Eliminar este trade?')) return;
  trades.splice(idx, 1);
  saveData();
  renderJournalAll();
};

/* ══════════════════════════════
   MODAL — Nueva operación
══════════════════════════════ */

function openModal() {
  selectedTags = [];
  document.getElementById('f-date').value = todayStr();
  document.getElementById('f-bal').value  = getBalance().toFixed(2);
  ['f-entry','f-exit','f-lots','f-pnl','f-rr','f-note'].forEach(id => {
    document.getElementById(id).value = '';
  });
  renderTagButtons();
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('btn-new-trade').addEventListener('click', openModal);
document.getElementById('btn-cancel').addEventListener('click',    closeModal);
document.getElementById('btn-modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

/* ── Tags inside modal ── */
function renderTagButtons() {
  document.getElementById('tags-row').innerHTML = AVAILABLE_TAGS.map(t =>
    `<button class="tag-btn ${selectedTags.includes(t) ? 'active' : ''}"
      onclick="toggleTag('${t}')">${t}</button>`
  ).join('');
}

window.toggleTag = function(t) {
  const idx = selectedTags.indexOf(t);
  idx === -1 ? selectedTags.push(t) : selectedTags.splice(idx, 1);
  renderTagButtons();
};

/* ── Save trade ── */
document.getElementById('btn-save').addEventListener('click', () => {
  const pnl     = parseFloat(document.getElementById('f-pnl').value);
  const balance = parseFloat(document.getElementById('f-bal').value);

  if (isNaN(pnl) || isNaN(balance)) {
    const btn = document.getElementById('btn-save');
    btn.classList.add('error');
    setTimeout(() => btn.classList.remove('error'), 400);
    document.getElementById('f-pnl').focus();
    return;
  }

  trades.push({
    pair:    document.getElementById('f-pair').value,
    dir:     document.getElementById('f-dir').value,
    session: document.getElementById('f-session').value,
    entry:   document.getElementById('f-entry').value  || null,
    exit:    document.getElementById('f-exit').value   || null,
    lots:    document.getElementById('f-lots').value   || null,
    balance,
    pnl,
    rr:      document.getElementById('f-rr').value    || null,
    note:    document.getElementById('f-note').value.trim(),
    date:    document.getElementById('f-date').value  || todayStr(),
    tags:    [...selectedTags]
  });

  saveData();
  closeModal();
  renderJournalAll();
});

/* ══════════════════════════════
   ANALYTICS PAGE
══════════════════════════════ */

function getFilteredAnalytics() {
  const period = document.getElementById('period-filter').value;
  const pair   = document.getElementById('pair-filter').value;
  const now    = new Date();

  return trades.filter(t => {
    if (period !== 'all') {
      const d    = new Date(t.date + 'T12:00:00');
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      if (diff > parseInt(period)) return false;
    }
    if (pair !== 'all' && t.pair !== pair) return false;
    return true;
  });
}

function populatePairFilter() {
  const pairs = [...new Set(trades.map(t => t.pair))];
  const sel   = document.getElementById('pair-filter');
  sel.innerHTML = '<option value="all">Todos los pares</option>' +
    pairs.map(p => `<option value="${p}">${p}</option>`).join('');
}

function calcMaxDD(list) {
  const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1));
  let peak = 0, bal = 0, maxDD = 0;
  sorted.forEach(t => {
    bal += t.pnl;
    if (bal > peak) peak = bal;
    const dd = peak - bal;
    if (dd > maxDD) maxDD = dd;
  });
  return maxDD;
}

function calcMaxStreak(list) {
  const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1));
  let maxW = 0, maxL = 0, cw = 0, cl = 0;
  sorted.forEach(t => {
    if (t.pnl > 0) { cw++; cl = 0; if (cw > maxW) maxW = cw; }
    else            { cl++; cw = 0; if (cl > maxL) maxL = cl; }
  });
  return { w: maxW, l: maxL };
}

/* ── KPIs ── */
function renderKPIs(list) {
  const total  = list.reduce((s, t) => s + t.pnl, 0);
  const wins   = list.filter(t => t.pnl > 0);
  const losses = list.filter(t => t.pnl < 0);
  const wr     = list.length ? Math.round(wins.length / list.length * 100) : 0;
  const avgWin  = wins.length   ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length   : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const pf      = avgLoss > 0   ? (avgWin * wins.length / (avgLoss * losses.length)).toFixed(2) : '—';
  const maxDD   = calcMaxDD(list);
  const streak  = calcMaxStreak(list);
  const avgRRlist = list.filter(t => t.rr);
  const avgRR   = avgRRlist.length
    ? (avgRRlist.reduce((s, t) => s + parseFloat(t.rr), 0) / avgRRlist.length).toFixed(2)
    : '—';

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Net P&L</div>
      <div class="kpi-val ${total >= 0 ? 'g' : 'r'}">${total >= 0 ? '+' : ''}$${total.toFixed(2)}</div>
      <div class="kpi-sub">${list.length} trades</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Win rate</div>
      <div class="kpi-val ${wr >= 50 ? 'g' : 'r'}">${wr}%</div>
      <div class="kpi-sub">${wins.length}W · ${losses.length}L</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Profit factor</div>
      <div class="kpi-val ${parseFloat(pf) >= 1 ? 'g' : 'r'}">${pf}</div>
      <div class="kpi-sub">avg R:R ${avgRR}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Max drawdown</div>
      <div class="kpi-val r">${maxDD > 0 ? '-$' + maxDD.toFixed(2) : '—'}</div>
      <div class="kpi-sub">racha +${streak.w}W · -${streak.l}L</div>
    </div>
  `;

  document.getElementById('analytics-pill').textContent = `Juanes · $${getBalance().toFixed(2)}`;
}

/* ── Equity full ── */
function renderAnalyticsEquity(list) {
  destroyChart('a-equity');
  const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1));
  if (!sorted.length) return;

  const labels = [], data = [];
  let bal = sorted[0].balance || 10000;
  sorted.forEach(t => {
    bal += t.pnl;
    labels.push(fmtDate(t.date));
    data.push(parseFloat(bal.toFixed(2)));
  });

  const isUp = data[data.length - 1] >= data[0];
  const ctx  = document.getElementById('ch-equity').getContext('2d');

  charts['a-equity'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor:          isUp ? '#22c55e' : '#ef4444',
        borderWidth:          1.5,
        pointRadius:          data.length > 15 ? 0 : 2.5,
        pointBackgroundColor: isUp ? '#22c55e' : '#ef4444',
        fill:    false,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => '$' + c.parsed.y.toFixed(2) } }
      },
      scales: {
        x: {
          display: true,
          ticks: { color: '#4a4f66', font: { size: 9 }, maxTicksLimit: 10, autoSkip: true },
          grid:  { color: '#1c2030' }
        },
        y: {
          display: true,
          grid:  { color: '#1c2030' },
          ticks: { color: '#4a4f66', font: { size: 9 }, callback: v => '$' + v }
        }
      }
    }
  });
}

/* ── Session ── */
function renderSession(list) {
  destroyChart('a-session');
  const sessions = {};
  list.forEach(t => {
    const s = t.session || 'Sin sesión';
    if (!sessions[s]) sessions[s] = { pnl: 0, n: 0 };
    sessions[s].pnl += t.pnl;
    sessions[s].n++;
  });

  const labels = Object.keys(sessions);
  const data   = labels.map(s => parseFloat(sessions[s].pnl.toFixed(2)));
  const colors = data.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  const ctx    = document.getElementById('ch-session').getContext('2d');

  charts['a-session'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 3, barThickness: 28 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (c.parsed.y >= 0 ? '+' : '') + '$' + c.parsed.y.toFixed(2) } } },
      scales: {
        x: { ticks: { color: '#4a4f66', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#4a4f66', font: { size: 9 }, callback: v => '$' + v }, grid: { color: '#1c2030' } }
      }
    }
  });
}

/* ── Day of week ── */
function renderDayChart(list) {
  destroyChart('a-day');
  const days   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const dayMap = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 };
  const sums   = new Array(7).fill(0);
  list.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    sums[dayMap[d.getDay()]] += t.pnl;
  });

  const data   = sums.map(v => parseFloat(v.toFixed(2)));
  const colors = data.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  const ctx    = document.getElementById('ch-day').getContext('2d');

  charts['a-day'] = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ data, backgroundColor: colors, borderRadius: 3, barThickness: 24 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (c.parsed.y >= 0 ? '+' : '') + '$' + c.parsed.y.toFixed(2) } } },
      scales: {
        x: { ticks: { color: '#4a4f66', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#4a4f66', font: { size: 9 }, callback: v => '$' + v }, grid: { color: '#1c2030' } }
      }
    }
  });
}

/* ── Distribution ── */
function renderDist(list) {
  destroyChart('a-dist');
  if (!list.length) return;

  const vals   = list.map(t => t.pnl);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals);
  const BUCKETS = 8;
  const step   = (maxVal - minVal) / BUCKETS || 1;
  const bins = [], counts = [], colors = [];

  for (let i = 0; i < BUCKETS; i++) {
    const lo = minVal + i * step;
    const hi = lo + step;
    bins.push((lo >= 0 ? '+' : '') + lo.toFixed(0));
    counts.push(vals.filter(v => v >= lo && v < hi + (i === BUCKETS - 1 ? 0.01 : 0)).length);
    colors.push(lo >= 0 ? '#22c55e' : '#ef4444');
  }

  const ctx = document.getElementById('ch-dist').getContext('2d');
  charts['a-dist'] = new Chart(ctx, {
    type: 'bar',
    data: { labels: bins, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 2, barThickness: 18 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          title: ([c]) => c.label + ' → ' + (parseFloat(c.label) + step).toFixed(0),
          label: c => c.parsed.y + ' trades'
        }}
      },
      scales: {
        x: { ticks: { color: '#4a4f66', font: { size: 9 }, maxRotation: 30, autoSkip: false }, grid: { display: false } },
        y: { ticks: { color: '#4a4f66', font: { size: 9 } }, grid: { color: '#1c2030' } }
      }
    }
  });
}

/* ── Pair performance ── */
function renderPairChart(list) {
  destroyChart('a-pair');
  const pairs  = {};
  list.forEach(t => {
    if (!pairs[t.pair]) pairs[t.pair] = { pnl: 0, n: 0 };
    pairs[t.pair].pnl += t.pnl;
    pairs[t.pair].n++;
  });

  const sorted = Object.entries(pairs).sort((a, b) => b[1].pnl - a[1].pnl);
  const labels = sorted.map(([k]) => k);
  const data   = sorted.map(([, v]) => parseFloat(v.pnl.toFixed(2)));
  const colors = data.map(v => v >= 0 ? '#22c55e' : '#ef4444');
  const ctx    = document.getElementById('ch-pair').getContext('2d');

  charts['a-pair'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 3, barThickness: 24 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (c.parsed.y >= 0 ? '+' : '') + '$' + c.parsed.y.toFixed(2) } } },
      scales: {
        x: { ticks: { color: '#4a4f66', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#4a4f66', font: { size: 9 }, callback: v => '$' + v }, grid: { color: '#1c2030' } }
      }
    }
  });
}

/* ── Streak dots ── */
function renderStreak(list) {
  const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1)).slice(-30);
  const row    = document.getElementById('streak-row');
  if (!sorted.length) {
    row.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Sin trades</span>';
    return;
  }
  row.innerHTML = sorted.map(t =>
    `<div class="streak-dot"
      style="background:${t.pnl >= 0 ? '#22c55e' : '#ef4444'}"
      title="${t.pair} ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)} (${fmtDate(t.date)})">
    </div>`
  ).join('');
}

/* ── Tags table ── */
function renderTagsTable(list) {
  const tagMap = {};
  list.forEach(t => {
    (t.tags || []).forEach(tg => {
      if (!tagMap[tg]) tagMap[tg] = { n: 0, wins: 0, pnl: 0 };
      tagMap[tg].n++;
      if (t.pnl > 0) tagMap[tg].wins++;
      tagMap[tg].pnl += t.pnl;
    });
  });

  const sorted = Object.entries(tagMap).sort((a, b) => b[1].pnl - a[1].pnl);
  const tbody  = document.getElementById('tag-tbody');

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">Sin tags registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(([tag, v]) => {
    const wr  = Math.round(v.wins / v.n * 100);
    const avg = (v.pnl / v.n);
    return `
      <tr>
        <td>${tag}</td>
        <td>${v.n}</td>
        <td>
          <span class="${wr >= 50 ? 'pnl-g' : 'pnl-r'}">${wr}%</span>
          <div class="wr-bar-bg">
            <div class="wr-bar" style="width:${wr}%;background:${wr >= 50 ? '#22c55e' : '#ef4444'}"></div>
          </div>
        </td>
        <td class="${v.pnl >= 0 ? 'pnl-g' : 'pnl-r'}">${v.pnl >= 0 ? '+' : ''}$${v.pnl.toFixed(2)}</td>
        <td class="${avg >= 0 ? 'pnl-g' : 'pnl-r'}">${avg >= 0 ? '+' : ''}$${avg.toFixed(2)}</td>
      </tr>`;
  }).join('');
}

/* ── Full analytics render ── */
function renderAnalytics() {
  const list = getFilteredAnalytics();

  const isEmpty = !trades.length;
  document.getElementById('analytics-empty').classList.toggle('hidden', !isEmpty);
  document.getElementById('analytics-charts').classList.toggle('hidden', isEmpty);

  if (isEmpty) return;

  populatePairFilter();
  renderKPIs(list);
  renderAnalyticsEquity(list);
  renderSession(list);
  renderDayChart(list);
  renderDist(list);
  renderPairChart(list);
  renderStreak(list);
  renderTagsTable(list);
}

/* ── Analytics filters ── */
document.getElementById('period-filter').addEventListener('change', renderAnalytics);
document.getElementById('pair-filter').addEventListener('change',   renderAnalytics);

/* ══ INIT ══ */
(function init() {
  loadData();
  renderJournalAll();
})();
