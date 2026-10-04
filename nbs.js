/* nbs.js — engine compartilhado da Consulta NBS 2.0 (browser + node).
 * Funcoes puras exportadas para teste em node; DOM isolado em NBS.init. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NBS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Termo sempre escapado para HTML antes do <mark> (anti self-XSS).
  function highlight(text, term, field) {
    var t = escapeHtml(text);
    var p = String(term || '').trim();
    if (!p) return t;
    try {
      return t.replace(new RegExp('(' + escapeRegExp(escapeHtml(p)) + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) { return t; }
  }

  function filterRecords(records, term, field, pick) {
    var t = String(term || '').trim().toLowerCase();
    if (!t) return records.slice();
    pick = pick || function (r) { return [String(r.code == null ? '' : r.code), r.desc || '']; };
    return records.filter(function (r) {
      var parts = pick(r);
      var c = parts[0].toLowerCase().indexOf(t) !== -1;
      var d = parts[1].toLowerCase().indexOf(t) !== -1;
      return field === 'code' ? c : field === 'desc' ? d : (c || d);
    });
  }

  function paginate(rows, page, perPage) {
    var totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    var p = Math.min(Math.max(1, page), totalPages);
    return { page: rows.slice((p - 1) * perPage, p * perPage), totalPages: totalPages, current: p };
  }

  function debounce(fn, ms) {
    var h = null;
    return function () {
      var args = arguments, self = this;
      if (h) clearTimeout(h);
      h = setTimeout(function () { h = null; fn.apply(self, args); }, ms);
    };
  }

  // ---- DOM (browser apenas) ----
  function initTable(cfg) {
    var tbody = document.getElementById(cfg.tbodyId);
    var q = document.getElementById(cfg.qId);
    var field = document.getElementById(cfg.fieldId);
    var clear = document.getElementById(cfg.clearId);
    var res = document.getElementById(cfg.resultId);
    var pags = document.getElementById(cfg.pagesId);
    var data = cfg.data, order = 'code', asc = true, page = 1, PER = cfg.perPage || 22;

    function sorted(filtered) {
      var arr = filtered.slice();
      arr.sort(function (a, b) {
        var x = cfg.sortVal(a, order), y = cfg.sortVal(b, order);
        return x < y ? (asc ? -1 : 1) : x > y ? (asc ? 1 : -1) : 0;
      });
      return arr;
    }
    function render() {
      var f = sorted(filterRecords(data, q.value, field.value, cfg.pick));
      var pg = paginate(f, page, PER);
      page = pg.current;
      var term = q.value.trim(), mode = field.value;
      tbody.innerHTML = pg.page.length ? pg.page.map(function (r) {
        return cfg.rowHtml(r, term, mode);
      }).join('') : '<tr><td colspan="' + cfg.cols + '" style="text-align:center;padding:36px">Nenhum registro encontrado. Ajuste os filtros.</td></tr>';
      res.textContent = f.length + ' resultados';
      var h = '';
      if (pg.totalPages > 1) {
        h += '<button class="page-btn" data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>Anterior</button>';
        for (var i = 1; i <= pg.totalPages; i++) {
          if (i === 1 || i === pg.totalPages || Math.abs(i - page) <= 1) {
            h += '<button class="page-btn" data-p="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
          }
        }
        h += '<button class="page-btn" data-p="' + (page + 1) + '"' + (page === pg.totalPages ? ' disabled' : '') + '>Próxima</button>';
      }
      pags.innerHTML = h;
    }
    var apply = debounce(function () { page = 1; render(); }, 150);
    q.addEventListener('input', apply);
    field.addEventListener('change', function () { page = 1; render(); });
    clear.addEventListener('click', function () { q.value = ''; page = 1; render(); q.focus(); });
    pags.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b || b.disabled) return;
      page = +b.dataset.p; render();
    });
    document.getElementById(cfg.sortCodeId).addEventListener('click', function () {
      if (order === 'code') asc = !asc; else { order = 'code'; asc = true; } render();
    });
    document.getElementById(cfg.sortDescId).addEventListener('click', function () {
      if (order === 'desc') asc = !asc; else { order = 'desc'; asc = true; } render();
    });
    render();
  }

  function initTheme(btnId, lsKey) {
    var btn = document.getElementById(btnId);
    try {
      if (localStorage.getItem(lsKey) === 'dark') {
        document.documentElement.dataset.theme = 'dark';
        btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Tema claro';
      }
    } catch (e) {}
    btn.addEventListener('click', function () {
      var dark = document.documentElement.dataset.theme === 'dark';
      if (dark) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = 'dark';
      btn.setAttribute('aria-pressed', String(!dark));
      btn.textContent = dark ? 'Tema escuro' : 'Tema claro';
      try { localStorage.setItem(lsKey, dark ? 'light' : 'dark'); } catch (e) {}
    });
  }

  function initTabs(listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
      });
    });
  }

  return {
    escapeHtml: escapeHtml, highlight: highlight,
    filterRecords: filterRecords, paginate: paginate, debounce: debounce,
    initTable: initTable, initTheme: initTheme, initTabs: initTabs
  };
}));
