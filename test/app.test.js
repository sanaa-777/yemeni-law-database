const test = require('node:test');
const assert = require('node:assert/strict');
const { db, search } = require('../server');

test('database is loaded and categorized', () => {
  assert.ok(db.all.length >= 400, `expected at least 400 documents, got ${db.all.length}`);
  assert.ok(db.laws.length > 0);
  assert.ok(db.contracts.length > 0);
  assert.ok(db.library.length > 0);
});

test('Arabic legal search returns ranked results', () => {
  const results = search('قانون العمل', { limit: 5 });
  assert.ok(results.length > 0);
  assert.ok(results[0].title);
  assert.ok(results[0].score > 0);
});

test('search filters by category', () => {
  const results = search('دعوى', { category: 'library', limit: 10 });
  assert.ok(results.every(x => x.category === 'library'));
});
