const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codeScore, filterAndRank } = require('../nbs.js');

const ROWS = [
  { item: '01.05', nbs: '1.1103.21.00' }, // casa "11" no meio do NBS
  { item: '11.01', nbs: '1.0901.11.00' }, // casa "11" no segmento do Item
];

test('codeScore: prefixo do campo < inicio de segmento < substring', () => {
  assert.equal(codeScore('11.01', '11'), 0);
  assert.equal(codeScore('1.1103.21.00', '11'), 0);
  assert.equal(codeScore('04.11', '11'), 1);
  assert.equal(codeScore('1.1502.10.00', '15'), 1);
  assert.equal(codeScore('100301', '100301'), 0);
  assert.equal(codeScore('01.05', '11'), 3);
});

test('filterAndRank: Item 11.xx antes de NBS 1.11xx', () => {
  const out = filterAndRank(ROWS, '11', (r) => r.item + ' ' + r.nbs);
  assert.equal(out.length, 2);
  assert.equal(out[0].item, '11.01');
});

test('filterAndRank: Item pesa mais que subsegmento NBS', () => {
  const rows = [
    { item: '02.01', nbs: '1.1201.11.00' }, // "11" exato em subsegmento NBS
    { item: '11.05', nbs: '1.0901.20.00' }, // "11" no Item
  ];
  const out = filterAndRank(rows, '11', (r) => [[r.item, 0], [r.nbs, 1]]);
  assert.equal(out[0].item, '11.05');
});
