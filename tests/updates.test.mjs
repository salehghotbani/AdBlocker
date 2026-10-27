import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/updates.js';

const { create, compareVersions, releaseUrl, ENDPOINT, ALARM, NOTIFICATION, PERIOD_MINUTES } = globalThis.AdBlockUpdates;
const release = (tag = 'v1.3.0', extra = {}) => ({ tag_name: tag, draft: false, prerelease: false, ...extra });

function harness(initial = {}) {
  let saved = structuredClone(initial), time = 1000000000, alarm;
  let response = () => new Response(JSON.stringify(release()));
  let denyNotification = false;
  const requests = [], notifications = [], opened = [], cleared = [], schedules = [];
  const api = {
    runtime: { getManifest: () => ({ version: '1.2.0' }), getURL: path => `chrome-extension://fixture/${path}` },
    storage: { local: {
      async get(key) { return { [key]: structuredClone(saved) }; },
      async set(value) { saved = structuredClone(value.updateState); }
    } },
    alarms: { async get() { return alarm; }, async create(name, options) {
      schedules.push({ name, ...options }); alarm = { ...options };
    } },
    notifications: { async create(id, options) {
      if (denyNotification) throw new Error('OS notifications disabled');
      notifications.push({ id, ...options });
    }, async clear(id) { cleared.push(id); } },
    tabs: { async create(value) { opened.push(value); } }
  };
  const make = () => create(api, { now: () => time, fetch: async (...args) => {
    requests.push(args); return response();
  } });
  return { make, requests, notifications, opened, cleared, schedules,
    advance(ms) { time += ms; }, dropAlarm() { alarm = undefined; },
    respond(fn) { response = fn; }, denyNotifications() { denyNotification = true; },
    get saved() { return saved; }, get time() { return time; } };
}

test('versions are compared numerically and release links cannot escape the project', () => {
  for (const [left, right, expected] of [['1.10.0', '1.9.0', 1], ['v1.2.0', '1.2.0.0', 0],
    ['1.2.0', '1.2.1', -1], ['1.2.0.1', '1.2.0', 1]]) assert.equal(compareVersions(left, right), expected);
  for (const tag of ['v1.3.0-beta', 'v1.3.0/../../evil', 'javascript:alert(1)', 'v1.3.0?x=1',
    'v01.2.0', '65536.0.0', null, {}]) assert.equal(releaseUrl(tag), null);
  assert.equal(releaseUrl('v1.3.0'), 'https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.0');
});

test('three-day alarm is restored after restart without postponing an existing alarm', async () => {
  const h = harness(), updater = h.make();
  await updater.initialize();
  assert.equal(h.requests.length, 0, 'startup performs no network request');
  assert.deepEqual(h.schedules[0], { name: ALARM, when: h.time + 60000, periodInMinutes: 4320 });
  await h.make().initialize();
  assert.equal(h.schedules.length, 1);
  await updater.check();
  h.dropAlarm(); h.advance(60000);
  await h.make().initialize();
  assert.equal(h.schedules[1].when, h.saved.lastAttempt + PERIOD_MINUTES * 60000);
  h.dropAlarm(); h.advance(PERIOD_MINUTES * 60000);
  await h.make().initialize();
  assert.equal(h.schedules[2].when, h.time + 60000, 'overdue check is scheduled promptly');
});

test('only fixed anonymous metadata is fetched; notification and cached link ignore remote URLs', async () => {
  const h = harness();
  h.respond(() => new Response(JSON.stringify(release('v1.3.0', {
    html_url: 'https://attacker.example/', body: '<script>bad()</script>', assets: [{ browser_download_url: 'javascript:bad()' }]
  }))));
  const updater = h.make(), status = await updater.check();
  assert.equal(status.available, true);
  assert.equal(h.requests[0][0], ENDPOINT);
  const options = h.requests[0][1];
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, undefined);
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0].id, NOTIFICATION);
  assert.equal(h.saved.notifiedTag, 'v1.3.0');
  await updater.openUpdate('another-notification');
  assert.equal(h.opened.length, 0);
  await updater.openUpdate(NOTIFICATION);
  assert.deepEqual(h.opened, [{ url: releaseUrl('v1.3.0') }]);
  assert.deepEqual(h.cleared, [NOTIFICATION]);
});

test('concurrent checks share a request, rapid checks use cache, and each newer version notifies once', async () => {
  const h = harness(), updater = h.make();
  await Promise.all([updater.check(), updater.check(), updater.check()]);
  assert.equal(h.requests.length, 1);
  assert.equal((await updater.check()).cached, true);
  assert.equal(h.requests.length, 1);
  h.advance(60001);
  await h.make().check();
  assert.equal(h.notifications.length, 1, 'notification deduplication survives worker restart');
  h.respond(() => new Response(JSON.stringify(release('v1.4.0')))); h.advance(60001);
  await updater.check();
  assert.equal(h.notifications.length, 2);
});

test('equal or older versions and failed OS notification do not produce false success', async () => {
  const h = harness(), updater = h.make();
  for (const tag of ['v1.2.0', 'v1.1.9']) {
    h.respond(() => new Response(JSON.stringify(release(tag))));
    assert.equal((await updater.check()).available, false);
    h.advance(60001);
  }
  assert.equal(h.notifications.length, 0);
  h.respond(() => new Response(JSON.stringify(release()))); h.denyNotifications();
  assert.equal((await updater.check()).available, true, 'popup remains usable without OS notifications');
  assert.equal(h.saved.notifiedTag, null);
});

test('network errors preserve cached updates and last successful time; rate limits back off', async () => {
  const h = harness(), updater = h.make();
  const good = await updater.check(); h.advance(60001);
  h.respond(() => { throw new Error('offline'); });
  const failed = await updater.check();
  assert.equal(failed.error, 'network');
  assert.equal(failed.available, true);
  assert.equal(failed.lastChecked, good.lastChecked);
  h.advance(60001); h.respond(() => new Response('{}', { status: 429 }));
  assert.equal((await updater.check()).error, 'rate_limit');
  const count = h.requests.length; h.advance(60001);
  assert.equal((await updater.check()).cached, true);
  assert.equal(h.requests.length, count);
});

test('drafts, prereleases, unsafe tags, malformed JSON and oversized metadata are rejected', async () => {
  for (const body of [JSON.stringify(release('v1.3.0', { draft: true })),
    JSON.stringify(release('v1.3.0', { prerelease: true })), JSON.stringify(release('v1.3.0/evil')),
    '{bad json', 'x'.repeat(1024 * 1024 + 1)]) {
    const h = harness(); h.respond(() => new Response(body));
    const result = await h.make().check();
    assert.equal(result.error, 'response');
    assert.equal(result.lastChecked, 0);
    assert.equal(result.available, false);
    assert.equal(h.notifications.length, 0);
  }
  const corrupt = harness({ latestTag: 'javascript:bad()', releaseUrl: 'https://attacker.example/', lastChecked: 'yesterday' });
  assert.equal((await corrupt.make().getStatus()).releaseUrl, null);
});
