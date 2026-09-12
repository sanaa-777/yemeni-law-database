const test = require('node:test');
const assert = require('node:assert/strict');
const { db, search } = require('../server');
const { retrieve, fallbackAnalysis, buildModelPayload, parseModel } = require('../agent-engine');

test('retrieval normalizes Arabic variants and returns excerpts', () => {
  const hits = retrieve('قانون الأحوال الشخصية', db, search, 6);
  assert.ok(hits.length > 0);
  assert.ok(hits[0].excerpt.length > 50);
  assert.ok(hits[0].categoryName);
});

test('fallback analysis exposes safe legal structure', () => {
  const hits = retrieve('دعوى نفقة', db, search, 6);
  const result = fallbackAnalysis('دعوى نفقة', hits);
  assert.equal(result.grounded, true);
  assert.ok(result.analysis.nextSteps.length > 0);
  assert.ok(result.sources.length > 0);
});

test('model payload requires defenses, documents, loopholes and judicial view', () => {
  const prompt = buildModelPayload('نزاع عقد بيع', retrieve('عقد بيع', db, search, 4));
  assert.match(prompt.system, /الدفوع/);
  assert.match(prompt.system, /القاضي/);
  assert.match(prompt.user, /loopholes/);
});

test('malformed model output safely falls back', () => {
  const fallback = fallbackAnalysis('اختبار', []);
  const result = parseModel('{not-json', fallback);
  assert.equal(result.modelReviewed, false);
  assert.equal(result.grounded, false);
});
