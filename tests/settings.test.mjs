import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/settings.js';
const { normalize, hostname, isAllowed, allowRules } = globalThis.AdBlockSettings;

test('defaults fail toward working web content and invalid storage is sanitized', () => {
  assert.deepEqual(normalize(), { enabled: true, allowedSites: [] });
  assert.deepEqual(normalize({ enabled: false, allowedSites: ['EXAMPLE.com', 'https://example.com/a', null, 'http://', 'file:///a'] }),
    { enabled: false, allowedSites: ['example.com'] });
});
test('site exclusions use domain boundaries and include child domains', () => {
  assert.equal(hostname('https://فارسی.ir/path'), 'xn--mgbug7c06b.ir');
  assert.equal(isAllowed('news.example.com', ['example.com']), true);
  assert.equal(isAllowed('notexample.com', ['example.com']), false);
  assert.equal(isAllowed('example.com.evil.test', ['example.com']), false);
});
test('allow rules override blocking for the frame tree and initiators', () => {
  assert.deepEqual(allowRules([]), []);
  const rules = allowRules(['example.com']);
  assert.equal(rules[0].action.type, 'allowAllRequests');
  assert.deepEqual(rules[0].condition.resourceTypes, ['main_frame']);
  assert.deepEqual(rules[1].condition.initiatorDomains, ['example.com']);
  assert.ok(rules.every(rule => rule.priority > 1));
});
