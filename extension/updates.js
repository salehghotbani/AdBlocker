(() => {
  'use strict';
  const ENDPOINT = 'https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest';
  const RELEASES = 'https://github.com/salehghotbani/AdBlocker/releases/tag/';
  const ALARM = 'adblocker-update-check';
  const NOTIFICATION = 'adblocker-update-available';
  const PERIOD_MINUTES = 3 * 24 * 60;
  const MIN_INTERVAL = 60 * 1000;
  const KEY = 'updateState';

  function versionParts(value) {
    if (typeof value !== 'string' || !/^v?(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){2,3}$/.test(value)) return null;
    const parts = value.replace(/^v/, '').split('.').map(Number);
    if (parts.some(part => part > 65535)) return null;
    while (parts.length < 4) parts.push(0);
    return parts;
  }

  function compareVersions(left, right) {
    const a = versionParts(left), b = versionParts(right);
    if (!a || !b) throw new Error('Invalid version');
    for (let index = 0; index < 4; index++) if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    return 0;
  }

  const releaseUrl = tag => versionParts(tag) ? RELEASES + encodeURIComponent(tag) : null;
  const timestamp = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      lastAttempt: timestamp(value.lastAttempt), lastChecked: timestamp(value.lastChecked),
      retryAfter: timestamp(value.retryAfter),
      latestTag: versionParts(value.latestTag) ? value.latestTag : null,
      notifiedTag: versionParts(value.notifiedTag) ? value.notifiedTag : null,
      error: ['network', 'response', 'rate_limit'].includes(value.error) ? value.error : null
    };
  }

  function create(api, { fetch: fetchRelease = globalThis.fetch, now = Date.now } = {}) {
    let inFlight = null;
    let scheduleFailed = false;
    const hasAlarms = () => typeof api.alarms?.get === 'function' && typeof api.alarms?.create === 'function' &&
      typeof api.alarms?.onAlarm?.addListener === 'function';
    const hasNotifications = () => typeof api.notifications?.create === 'function' &&
      typeof api.notifications?.onClicked?.addListener === 'function';
    const read = async () => normalize((await api.storage.local.get(KEY))[KEY]);
    const write = state => api.storage.local.set({ [KEY]: state });
    function status(state) {
      const currentVersion = api.runtime.getManifest().version;
      const available = Boolean(state.latestTag && compareVersions(state.latestTag, currentVersion) > 0);
      return { currentVersion, latestTag: state.latestTag,
        latestVersion: state.latestTag?.replace(/^v/, '') || null,
        available, releaseUrl: available ? releaseUrl(state.latestTag) : null,
        lastChecked: state.lastChecked, error: state.error, retryAfter: state.retryAfter,
        automaticChecks: hasAlarms() && !scheduleFailed, notificationsAvailable: hasNotifications() };
    }

    async function initialize() {
      if (!hasAlarms()) return;
      try {
        const alarm = await api.alarms.get(ALARM);
        if (alarm?.periodInMinutes !== PERIOD_MINUTES) {
          const state = await read();
          const due = state.lastAttempt ? state.lastAttempt + PERIOD_MINUTES * 60000 : 0;
          // Recreate missing alarms without depending on a live worker timer.
          await api.alarms.create(ALARM, {
            when: Math.max(now() + MIN_INTERVAL, Math.min(due, now() + PERIOD_MINUTES * 60000)),
            periodInMinutes: PERIOD_MINUTES
          });
        }
        scheduleFailed = false;
      } catch { scheduleFailed = true; }
    }

    function check() {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        let state = await read();
        const time = now();
        if (state.retryAfter > time || (state.lastAttempt && time - state.lastAttempt < MIN_INTERVAL &&
            state.lastAttempt <= time)) return { ...status(state), cached: true };
        state = { ...state, lastAttempt: time };
        await write(state);
        try {
          const response = await fetchRelease(ENDPOINT, {
            method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer',
            cache: 'no-store', redirect: 'error',
            headers: { Accept: 'application/vnd.github+json' },
            signal: AbortSignal.timeout(10000)
          });
          if (response.status === 403 || response.status === 429) {
            state.retryAfter = time + 60 * 60 * 1000;
            throw new Error('rate_limit');
          }
          if (!response.ok || response.redirected) throw new Error('response');
          if (!response.body) throw new Error('response');
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let body = '', bytes = 0;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 1024 * 1024) { await reader.cancel(); throw new Error('response'); }
            body += decoder.decode(value, { stream: true });
          }
          body += decoder.decode();
          let release;
          try { release = JSON.parse(body); } catch { throw new Error('response'); }
          if (!release || release.draft !== false || release.prerelease !== false || !versionParts(release.tag_name)) {
            throw new Error('response');
          }
          state = { ...state, latestTag: release.tag_name, lastChecked: now(), error: null, retryAfter: 0 };
        } catch (error) {
          state.error = ['response', 'rate_limit'].includes(error.message) ? error.message : 'network';
        }
        await write(state);
        if (hasNotifications() && !state.error && status(state).available &&
            (!state.notifiedTag || compareVersions(state.latestTag, state.notifiedTag) > 0)) {
          try {
            await api.notifications.create(NOTIFICATION, {
              type: 'basic', iconUrl: api.runtime.getURL('icons/128.png'),
              title: 'به‌روزرسانی AdBlocker',
              message: `نسخهٔ ${state.latestTag.replace(/^v/, '')} آماده است. برای دریافت کلیک کنید.`
            });
            state.notifiedTag = state.latestTag;
            await write(state);
          } catch { /* The popup still shows the update if OS notifications are unavailable. */ }
        }
        return status(state);
      })().finally(() => { inFlight = null; });
      return inFlight;
    }

    async function openUpdate(notificationId) {
      if (notificationId !== NOTIFICATION) return;
      const update = status(await read());
      if (update.available) await api.tabs.create({ url: update.releaseUrl });
      if (typeof api.notifications?.clear === 'function') await api.notifications.clear(NOTIFICATION);
    }

    return { initialize, check, getStatus: async () => status(await read()), openUpdate };
  }

  globalThis.AdBlockUpdates = Object.freeze({ ENDPOINT, ALARM, NOTIFICATION, PERIOD_MINUTES,
    compareVersions, releaseUrl, create });
})();
