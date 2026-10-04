/* nbs.js — engine compartilhado da Consulta NBS 2.0 (browser + node).
 * Funcoes puras exportadas para teste em node; DOM isolado nas funcoes init*. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NBS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Marca TODAS as ocorrencias (termo sempre escapado — anti self-XSS).
  function highlight(text, term) {
    const t = escapeHtml(text);
    const p = String(term || '').trim();
    if (!p) return t;
    try {
      return t.replace(new RegExp('(' + escapeRegExp(escapeHtml(p)) + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) { return t; }
  }

  function rankOfPos(t, pos, len) {
    if (pos === 0) return 0;
    if (pos > 0 && /[^a-z0-9]/.test(t[pos - 1])) return 1;
    return 2;
  }

  // Marca UMA ocorrencia: a de melhor posicao (inicio > inicio de segmento > demais).
  function highlightBest(text, term) {
    const t = escapeHtml(text);
    const raw = String(term || '').trim();
    if (!raw) return t;
    const p = escapeHtml(raw).toLowerCase();
    if (!p) return t;
    const lower = t.toLowerCase();
    let best = -1;
    let bestRank = 3;
    let i = lower.indexOf(p);
    while (i !== -1) {
      const r = rankOfPos(lower, i, p.length);
      if (r < bestRank) { bestRank = r; best = i; if (r === 0) break; }
      i = lower.indexOf(p, i + 1);
    }
    if (best === -1) return t;
    return t.slice(0, best) + '<mark>' + t.slice(best, best + p.length) + '</mark>' + t.slice(best + p.length);
  }

  // 0 = campo comeca pelo termo · 1 = segmento exato ou comeco de segmento · 2 = substring · 3 = sem match.
  function codeScore(code, term) {
    const c = String(code ?? '').toLowerCase();
    const t = String(term || '').trim().toLowerCase();
    if (!t) return 0;
    if (c === t) return 0;
    const flat = c.replace(/[^a-z0-9]/g, '');
    const tf = t.replace(/[^a-z0-9]/g, '');
    if (!tf) return 3;
    if (flat.indexOf(tf) === 0) return 0;
    const segs = c.split(/[^a-z0-9]+/);
    for (const s of segs) {
      if (s === tf || s.indexOf(tf) === 0) return 1;
    }
    if (flat.indexOf(tf) !== -1) return 2;
    return 3;
  }

  // fieldsFn(r) -> texto OU [[texto, pesoCampo], ...]. Peso: Item=0, NBS=1, INDOP=2, cClass=3.
  // opts.prefixOnly: mantem apenas escore 0.
  function filterAndRank(records, term, fieldsFn, opts) {
    const t = String(term || '').trim();
    if (!t) return records.slice();
    const prefixOnly = !!(opts && opts.prefixOnly);
    const scored = [];
    records.forEach((r, i) => {
      let f = fieldsFn(r);
      if (typeof f === 'string') f = [[f, 1]];
      let best = null;
      for (const [text, weight] of f) {
        const s = codeScore(text, t);
        if ((prefixOnly ? s === 0 : s < 3) && (best === null || s < best[0] || (s === best[0] && weight < best[1]))) {
          best = [s, weight];
        }
      }
      if (best !== null) scored.push([best[0], best[1], i, r]);
    });
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return scored.map((x) => x[3]);
  }

  function filterRecords(records, term, field, pick) {
    const t = String(term || '').trim().toLowerCase();
    if (!t) return records.slice();
    const fn = pick || ((r) => [String(r.code ?? ''), r.desc || '']);
    return records.filter((r) => {
      const parts = fn(r);
      const c = parts[0].toLowerCase().indexOf(t) !== -1;
      const d = parts[1].toLowerCase().indexOf(t) !== -1;
      return field === 'code' ? c : field === 'desc' ? d : (c || d);
    });
  }

  function paginate(rows, page, perPage) {
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    const p = Math.min(Math.max(1, page), totalPages);
    return { page: rows.slice((p - 1) * perPage, p * perPage), totalPages, current: p };
  }

  function debounce(fn, ms) {
    let h = null;
    return function (...args) {
      clearTimeout(h);
      h = setTimeout(() => { h = null; fn.apply(this, args); }, ms);
    };
  }

  // ---- DOM (browser apenas) ----
  function currentList(data, q, field, cfg) {
    const term = q.value.trim();
    const mode = field.value;
    const po = !!(cfg.prefixCheckId && document.getElementById(cfg.prefixCheckId).checked);
    if (mode === 'desc') {
      return filterRecords(data, term, 'desc', (r) => ['', cfg.restText(r)]);
    }
    const ranked = filterAndRank(data, term, cfg.codeText, { prefixOnly: po });
    if (mode === 'code') return ranked;
    const set = new Set(ranked);
    const extra = filterRecords(data, term, 'desc', (r) => ['', cfg.restText(r)])
      .filter((r) => !set.has(r));
    return ranked.concat(extra);
  }

  function initTable(cfg) {
    const tbody = document.getElementById(cfg.tbodyId);
    const q = document.getElementById(cfg.qId);
    const field = document.getElementById(cfg.fieldId);
    const clear = document.getElementById(cfg.clearId);
    const res = document.getElementById(cfg.resultId);
    const pags = document.getElementById(cfg.pagesId);
    const data = cfg.data;
    let order = 'code';
    let asc = true;
    let page = 1;
    const PER = cfg.perPage || 22;

    function sorted(filtered) {
      const arr = filtered.slice();
      arr.sort((a, b) => {
        const x = cfg.sortVal(a, order);
        const y = cfg.sortVal(b, order);
        return x < y ? (asc ? -1 : 1) : x > y ? (asc ? 1 : -1) : 0;
      });
      return arr;
    }
    function render() {
      const f = sorted(currentList(data, q, field, cfg));
      const pg = paginate(f, page, PER);
      page = pg.current;
      const term = q.value.trim();
      const mode = field.value;
      tbody.innerHTML = pg.page.length ? pg.page.map((r) => cfg.rowHtml(r, term, mode)).join('')
        : '<tr><td colspan="' + cfg.cols + '" style="text-align:center;padding:36px">Nenhum registro encontrado. Ajuste os filtros.</td></tr>';
      res.textContent = f.length + ' resultados';
      let h = '';
      if (pg.totalPages > 1) {
        h += '<button class="page-btn" data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>Anterior</button>';
        for (let i = 1; i <= pg.totalPages; i++) {
          if (i === 1 || i === pg.totalPages || Math.abs(i - page) <= 1) {
            h += '<button class="page-btn" data-p="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
          }
        }
        h += '<button class="page-btn" data-p="' + (page + 1) + '"' + (page === pg.totalPages ? ' disabled' : '') + '>Próxima</button>';
      }
      pags.innerHTML = h;
    }
    const apply = debounce(() => { page = 1; render(); }, 150);
    q.addEventListener('input', apply);
    field.addEventListener('change', () => { page = 1; render(); });
    if (cfg.prefixCheckId) {
      document.getElementById(cfg.prefixCheckId).addEventListener('change', () => { page = 1; render(); });
    }
    clear.addEventListener('click', () => { q.value = ''; page = 1; render(); q.focus(); });
    pags.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (!b || b.disabled) return;
      page = +b.dataset.p; render();
    });
    document.getElementById(cfg.sortCodeId).addEventListener('click', () => {
      if (order === 'code') asc = !asc; else { order = 'code'; asc = true; } render();
    });
    document.getElementById(cfg.sortDescId).addEventListener('click', () => {
      if (order === 'desc') asc = !asc; else { order = 'desc'; asc = true; } render();
    });
    render();
  }

  function initTheme(btnId, lsKey) {
    const btn = document.getElementById(btnId);
    try {
      if (localStorage.getItem(lsKey) === 'dark') {
        document.documentElement.dataset.theme = 'dark';
        btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Tema claro';
      }
    } catch (e) { /* armazenamento indisponivel */ }
    btn.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      if (dark) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = 'dark';
      btn.setAttribute('aria-pressed', String(!dark));
      btn.textContent = dark ? 'Tema escuro' : 'Tema claro';
      try { localStorage.setItem(lsKey, dark ? 'light' : 'dark'); } catch (e) { /* noop */ }
    });
  }

  function initTabs(listId, onSelect) {
    const list = document.getElementById(listId);
    if (!list) return;
    const tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        if (onSelect) onSelect(tab.id);
      });
    });
  }

  return {
    escapeHtml, highlight, highlightBest,
    filterRecords, filterAndRank, codeScore,
    paginate, debounce,
    initTable, initTheme, initTabs
  };
}));
