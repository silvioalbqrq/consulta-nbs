const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, filterRecords, paginate, highlight } = require('../nbs.js');

const SAMPLE = [
  { code: '1.0101.11.00', desc: 'Servicos de construcao' },
  { code: '1.1502.10.00', desc: 'Servicos de projeto de aplicativos' },
];

test('escapeHtml neutraliza tags', () => {
  assert.equal(escapeHtml('<img src=x onerror=a>'), '&lt;img src=x onerror=a&gt;');
  assert.equal(escapeHtml('a&b"c'), 'a&amp;b&quot;c');
});

test('highlight nao injeta HTML do termo', () => {
  const out = highlight('Servicos de construcao', '<b>', 'all');
  assert.ok(!out.includes('<b>'), 'termo cru nao pode vazar como HTML');
  assert.ok(out.includes('&lt;b&gt;') || out === 'Servicos de construcao');
});

test('filterRecords por codigo e descricao', () => {
  assert.equal(filterRecords(SAMPLE, '1.1502', 'all').length, 1);
  assert.equal(filterRecords(SAMPLE, 'construcao', 'desc').length, 1);
  assert.equal(filterRecords(SAMPLE, 'construcao', 'code').length, 0);
  assert.equal(filterRecords(SAMPLE, '', 'all').length, 2);
});

test('paginate fatia e totaliza', () => {
  const rows = Array.from({ length: 50 }, (_, i) => i);
  const p = paginate(rows, 3, 22);
  assert.deepEqual(p.page, rows.slice(44));
  assert.equal(p.totalPages, 3);
});
