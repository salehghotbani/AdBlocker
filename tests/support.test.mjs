import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateSupport } from '../scripts/support-config.mjs';

test('support configuration excludes secret fields, executable links and invalid receiving details', () => {
  assert.deepEqual(validateSupport({ url: null, crypto: [] }), { url: null, crypto: [] });
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', 'https://example.com/\n']) {
    assert.throws(() => validateSupport({ url, crypto: [] }));
  }
  assert.throws(() => validateSupport({ url: null, crypto: [], seed: 'secret' }));
  for (const item of [
    { asset: '<img>', network: 'tron', address: 'T'.repeat(34) },
    { asset: 'USDT', network: 'tron', address: '0x' + '0'.repeat(40) },
    { asset: 'USDT', network: 'unknown', address: 'T'.repeat(34) },
    { asset: 'USDT', network: 'tron', address: 'T'.repeat(34), privateKey: 'secret' }
  ]) assert.throws(() => validateSupport({ url: null, crypto: [item] }));
  const fixture = { asset: 'USDT', network: 'tron', address: 'T'.repeat(34) };
  assert.deepEqual(validateSupport({ url: null, crypto: [fixture] }).crypto, [fixture]);
  assert.throws(() => validateSupport({ url: null, crypto: [fixture, fixture] }));
});

const code = await readFile(new URL('../extension/store-updates.js', import.meta.url), 'utf8');
for (const [channel, name, expected] of [
  ['chrome', 'Chrome Web Store', 'chrome://extensions/?id=fixture'],
  ['edge', 'Microsoft Edge Add-ons', 'edge://extensions/?id=fixture'],
  ['firefox', 'Firefox Add-ons', 'moz-extension://fixture/update-help.html']
]) test(`${channel}: store updates make no network requests, schedules, notifications or false latest-version claims`, async () => {
  const opened = [];
  const context = vm.createContext({ AdBlockDistribution: { channel },
    fetch() { throw new Error('Store build must not fetch metadata'); } });
  vm.runInContext(code, context);
  const updater = context.AdBlockUpdates.create({ runtime: { id: 'fixture', getManifest: () => ({ version: '1.6.0' }), getURL: path => 'moz-extension://fixture/' + path },
    tabs: { async create(value) { opened.push(value.url); } } });
  await updater.initialize();
  const status = await updater.getStatus();
  assert.equal(status.managedByStore, true);
  assert.equal(status.storeName, name);
  assert.equal(status.available, false);
  assert.equal(status.lastChecked, undefined);
  assert.equal(context.AdBlockUpdates.releaseUrl('v9.0.0'), null);
  assert.deepEqual(opened, []);
  await updater.check();
  assert.deepEqual(opened, [expected]);
});
