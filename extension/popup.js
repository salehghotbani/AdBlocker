const t = (text, values) => AdBlockI18n.t(text, values);
const api = globalThis.browser || chrome;
const $ = id => document.getElementById(id);
let tab;
let host;
let settings;
let url;
let paused = false;
let busy = false;
let counterPending = false;
let counterPoll = null;
let lastCounters = null;
let lastUpdate = null;

function renderCounters(counters) {
  lastCounters = counters;
  for (const [id, value] of [['requestCount', counters?.requests], ['placementCount', counters?.placements]]) {
    const text = Number.isSafeInteger(value) && value >= 0 ? AdBlockI18n.number(value) : '—';
    if ($(id).textContent !== text) $(id).textContent = text;
  }
  $('counterHint').textContent = !url ? t('Counters are available on web pages.') :
    counters?.requests == null ? t('Main-page placements only. The network count is unavailable in this browser or context.') :
      t('Current page. Requests and main-page placements are separate counts.');
}

async function refreshCounters() {
  if (counterPending || !url || !Number.isInteger(tab?.id)) return;
  counterPending = true;
  $('refreshCounters').disabled = true;
  try { renderCounters((await send({ type: 'getCounters', tabId: tab.id, url })).counters); }
  catch { renderCounters(null); }
  finally { counterPending = false; $('refreshCounters').disabled = !url; }
}

function protectionOn() {
  return settings.enabled && !(host && AdBlockSettings.isAllowed(host, settings.allowedSites)) &&
    !settings.allowedUrls.includes(url) && !paused;
}

async function reloadCurrentPage() {
  if (!url || !Number.isInteger(tab?.id)) return false;
  const current = await api.tabs.get(tab.id);
  if (AdBlockSettings.pageUrl(current.url) !== url) return false;
  await api.tabs.reload(tab.id);
  return true;
}

function render() {
  const allowed = host && AdBlockSettings.isAllowed(host, settings.allowedSites);
  const urlAllowed = settings.allowedUrls.includes(url);
  const on = protectionOn();
  $('enabled').checked = settings.enabled;
  $('enabled').disabled = busy;
  $('siteEnabled').checked = !allowed;
  $('siteEnabled').disabled = busy || !host || !settings.enabled;
  $('urlEnabled').checked = !urlAllowed;
  $('urlEnabled').disabled = busy || !url || !settings.enabled || allowed;
  $('pause').disabled = busy || !url || (!paused && (!settings.enabled || allowed || urlAllowed));
  $('pauseLabel').textContent = paused ? t('Resume protection and reload') : t('Pause once and reload');
  $('totalCount').textContent = AdBlockI18n.number(settings.allowedSites.length + settings.allowedUrls.length);
  $('clearUrls').disabled = busy || !settings.allowedUrls.length;
  $('urlCount').textContent = `(${AdBlockI18n.number(settings.allowedUrls.length)})`;
  $('reload').disabled = busy || !host;
  $('clear').disabled = busy || !settings.allowedSites.length;
  $('count').textContent = `(${AdBlockI18n.number(settings.allowedSites.length)})`;
  $('status').textContent = !settings.enabled ? t('Protection is off') :
    !host ? t('Ready for web pages') : allowed ? t('This site is excluded') :
      urlAllowed ? t('This URL is excluded') : paused ? t('Temporarily paused on this page') : t('Protection is on');
  $('dot').classList.toggle('on', Boolean(on));
  $('protection').dataset.state = on ? 'on' : 'off';
  document.documentElement.dataset.protection = on ? 'on' : 'off';
  $('statusHint').textContent = !settings.enabled ? t('Turn it on whenever you are ready.') :
    !host ? t('These controls are available on web pages.') : on ? t('Ad filters are active on this page.') : t('Filters are paused on this page.');
}

async function send(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || t('Could not connect to the extension.'));
  return result;
}

async function change(message) {
  const wasOn = protectionOn();
  busy = true;
  $('message').textContent = '';
  render();
  try {
    const result = await send(message);
    settings = AdBlockSettings.normalize(result.settings);
    if (typeof result.paused === 'boolean') paused = result.paused;
    const reloaded = message.type !== 'setPause' && wasOn !== protectionOn() ? await reloadCurrentPage() : false;
    $('message').textContent = message.type === 'setPause' ?
      (paused ? t('Paused once. The next reload or navigation ends the pause.') : t('Protection resumed.')) :
      reloaded ? t('Saved. This page reloaded automatically.') : t('Settings saved.');
  } catch { $('message').textContent = t('Could not complete this action. Try again.'); }
  finally { busy = false; render(); refreshCounters(); }
}

$('enabled').addEventListener('change', () => change({ type: 'setEnabled', enabled: $('enabled').checked }));
$('siteEnabled').addEventListener('change', () => change({ type: 'setSite', host, allowed: !$('siteEnabled').checked }));
$('clear').addEventListener('click', () => change({ type: 'clearSites' }));
$('urlEnabled').addEventListener('change', () => change({ type: 'setUrl', url, allowed: !$('urlEnabled').checked }));
$('clearUrls').addEventListener('click', () => change({ type: 'clearUrls' }));
$('pause').addEventListener('click', () => change({ type: 'setPause', tabId: tab.id, url, paused: !paused }));
$('refreshCounters').addEventListener('click', refreshCounters);
addEventListener('pagehide', () => { if (counterPoll !== null) clearInterval(counterPoll); });
$('reload').addEventListener('click', async () => {
  try {
    if (await reloadCurrentPage()) window.close();
    else $('message').textContent = t('The page has changed. Reopen the extension popup.');
  }
  catch { $('message').textContent = t('Could not complete this action. Try again.'); }
});

function renderUpdate(update) {
  lastUpdate = update;
  if (update.managedByStore) {
    $('updateSchedule').textContent = t('Managed by browser');
    $('checkUpdates').textContent = update.openHelp ? t('Update help') : t('Open extension manager');
    $('updateLink').hidden = true;
    $('updateLink').removeAttribute('href');
    $('updateStatus').textContent = t('Updates are delivered by {store}. The browser handles approved updates according to your update settings.', { store: update.storeName });
    return;
  }
  $('updateSchedule').textContent = update.automaticChecks === false ? t('Manual checks') : t('Every 3 days');
  const href = update.available && AdBlockUpdates.releaseUrl(update.latestTag);
  $('updateLink').hidden = !href;
  if (href) $('updateLink').href = href;
  else $('updateLink').removeAttribute('href');
  const checked = update.lastChecked ? ' ' + t('Last successful check: {date}', { date: AdBlockI18n.date(update.lastChecked) }) : '';
  const cached = update.cached ? t('Cached result: ') : '';
  $('updateStatus').textContent = update.error ?
    (href ? t('The latest check failed; version {version} was found earlier.', { version: update.latestVersion }) :
      update.error === 'rate_limit' ? t('GitHub temporarily limited requests. Try again later.') :
        update.error === 'response' ? t('The update response was invalid. Try again later.') : t('Could not check for updates. Check your internet connection.')) + checked :
    href ? cached + t('Version {version} is available.', { version: update.latestVersion }) + checked :
      update.lastChecked ? cached + t('Your version is up to date.') + checked :
        update.automaticChecks === false ? t('Use Check for updates to look for a new version.') :
          t('Updates are checked every 3 days. You can also check now.');
  if (update.automaticChecks === false || update.notificationsAvailable === false) {
    $('updateStatus').textContent += ' ' + t('Scheduling or notifications are unavailable in this installation. Manual checks still work. Replace the complete extension package and reload the extension.');
  }
}

async function checkUpdates() {
  $('checkUpdates').disabled = true;
  const store = ['chrome', 'edge', 'firefox'].includes(globalThis.AdBlockDistribution?.channel);
  $('updateStatus').textContent = store ? t('Opening extension manager…') : t('Checking for updates…');
  try { renderUpdate((await send({ type: 'checkForUpdates' })).update); }
  catch { $('updateStatus').textContent = store ? t('Open Extensions or Add-ons from your browser menu to manage updates.') : t('Could not check for updates. Try again.'); }
  finally { $('checkUpdates').disabled = false; }
}
$('checkUpdates').addEventListener('click', checkUpdates);
addEventListener('adblock-language-changed', () => {
  if (settings) {
    render(); renderCounters(lastCounters);
    $('host').textContent = host || t('This page is not supported');
    $('url').textContent = url || t('This page is not supported');
  }
  if (lastUpdate) renderUpdate(lastUpdate);
  $('message').textContent = '';
});

(async () => {
  try {
    await AdBlockI18n.initialize();
    $('version').textContent = `v${api.runtime.getManifest().version}`;
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    host = tab?.url && /^https?:/.test(tab.url) ? AdBlockSettings.hostname(tab.url) : null;
    url = AdBlockSettings.pageUrl(tab?.url);
    $('host').textContent = host || t('This page is not supported');
    $('url').textContent = url || t('This page is not supported');
    $('url').title = url || '';
    const result = await send({ type: 'getSettings', tabId: tab?.id });
    settings = AdBlockSettings.normalize(result.settings);
    paused = result.paused === true;
    render();
    $('refreshCounters').disabled = !url;
    renderCounters(null);
    refreshCounters();
    counterPoll = setInterval(refreshCounters, 2000);
    try { renderUpdate((await send({ type: 'getUpdateStatus' })).update); }
    catch { $('updateStatus').textContent = t('Select Check for updates to check your version.'); }
  } catch { $('message').textContent = t('Could not connect to the extension.'); }
})();
