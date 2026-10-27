import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/settings.js';
const { normalize, hostname, isAllowed, allowRules, pageUrl } = globalThis.AdBlockSettings;

test('defaults fail toward working web content and invalid storage is sanitized', () => {
  assert.deepEqual(normalize(), { enabled: true, allowedSites: [], allowedUrls: [] });
  assert.deepEqual(normalize({ enabled: false, allowedSites: ['EXAMPLE.com', 'https://example.com/a', null, 'http://', 'file:///a'] }),
    { enabled: false, allowedSites: ['example.com'], allowedUrls: [] });
});

test('exact URL exceptions preserve scheme, port, path case and query; ignore fragments', () => {
  const url = pageUrl('https://EXAMPLE.com:443/Path?q=one.two&b=2#section');
  assert.equal(url, 'https://example.com/Path?q=one.two&b=2');
  assert.equal(pageUrl('file:///tmp/a'), null);
  assert.equal(pageUrl('https://user:password@example.com/'), null);
  const rules = allowRules([], [url]);
  const regex = new RegExp(rules[0].condition.regexFilter);
  assert.equal(regex.test(url), true);
  for (const other of [url + '&c=3', url.replace('/Path', '/path'), url.replace('one.two', 'oneXtwo'),
    url.replace('https:', 'http:'), url.replace('example.com', 'example.com.evil.test')]) {
    assert.equal(regex.test(other), false, other);
  }
  assert.equal(rules[0].condition.isUrlFilterCaseSensitive, true);
  assert.deepEqual(normalize({ allowedUrls: [url, url + '#anchor', 'about:blank'] }).allowedUrls, [url]);
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
