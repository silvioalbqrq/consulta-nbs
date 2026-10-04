const { test } = require('node:test');
const assert = require('node:assert/strict');
const NBS = require('../nbs.js');

test('highlightBest marca uma ocorrencia, na melhor posicao', () => {
  const out = NBS.highlightBest('1.1103.21.00', '11');
  assert.equal((out.match(/<mark>/g) || []).length, 1);
  assert.ok(out.includes('1.<mark>11</mark>03.21.00'), out);
});

test('highlightBest escapa HTML', () => {
  const out = NBS.highlightBest('a<b', '<b');
  assert.ok(!out.includes('<b>') || out.includes('&lt;b&gt;'));
});

test('filterAndRank vazio preserva ordem', () => {
  const rows = [{ c: 2 }, { c: 1 }];
  const out = NBS.filterAndRank(rows, '', (r) => [[String(r.c), 0]]);
  assert.deepEqual(out.map((r) => r.c), [2, 1]);
});

test('filterAndRank prefixOnly mantem so escore 0', () => {
  const rows = [{ item: '04.11' }, { item: '11.01' }];
  const out = NBS.filterAndRank(rows, '11', (r) => [[r.item, 0]], { prefixOnly: true });
  assert.deepEqual(out.map((r) => r.item), ['11.01']);
});

test('debounce executa uma vez apos rajada', async () => {
  let n = 0;
  const f = NBS.debounce(() => { n++; }, 150);
  f(); f(); f();
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(n, 1);
});
