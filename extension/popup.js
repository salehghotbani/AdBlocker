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

function renderCounters(counters) {
  for (const [id, value] of [['requestCount', counters?.requests], ['placementCount', counters?.placements]]) {
    const text = Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('en-US') : '—';
    if ($(id).textContent !== text) $(id).textContent = text;
  }
  $('counterHint').textContent = !url ? 'Counters are available on web pages.' :
    counters?.requests == null ? 'Main-page placements only. The network count is unavailable in this browser or context.' :
      'Current page. Requests and main-page placements are separate counts.';
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
  $('pauseLabel').textContent = paused ? 'Resume protection and reload' : 'Pause once and reload';
  $('totalCount').textContent = (settings.allowedSites.length + settings.allowedUrls.length).toLocaleString('en-US');
  $('clearUrls').disabled = busy || !settings.allowedUrls.length;
  $('urlCount').textContent = `(${settings.allowedUrls.length.toLocaleString('en-US')})`;
  $('reload').disabled = busy || !host;
  $('clear').disabled = busy || !settings.allowedSites.length;
  $('count').textContent = `(${settings.allowedSites.length.toLocaleString('en-US')})`;
  $('status').textContent = !settings.enabled ? 'Protection is off' :
    !host ? 'Ready for web pages' : allowed ? 'This site is excluded' :
      urlAllowed ? 'This URL is excluded' : paused ? 'Temporarily paused on this page' : 'Protection is on';
  $('dot').classList.toggle('on', Boolean(on));
  $('protection').dataset.state = on ? 'on' : 'off';
  document.documentElement.dataset.protection = on ? 'on' : 'off';
  $('statusHint').textContent = !settings.enabled ? 'Turn it on whenever you are ready.' :
    !host ? 'These controls are available on web pages.' : on ? 'Ad filters are active on this page.' : 'Filters are paused on this page.';
}

async function send(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || 'Could not connect to the extension.');
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
      (paused ? 'Paused once. The next reload or navigation ends the pause.' : 'Protection resumed.') :
      reloaded ? 'Saved. This page reloaded automatically.' : 'Settings saved.';
  } catch (error) { $('message').textContent = error.message; }
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
    else $('message').textContent = 'The page has changed. Reopen the extension popup.';
  }
  catch (error) { $('message').textContent = error.message; }
});

function renderUpdate(update) {
  $('updateSchedule').textContent = update.automaticChecks === false ? 'Manual checks' : 'Every 3 days';
  const href = update.available && AdBlockUpdates.releaseUrl(update.latestTag);
  $('updateLink').hidden = !href;
  if (href) $('updateLink').href = href;
  else $('updateLink').removeAttribute('href');
  const checked = update.lastChecked ? ` Last successful check: ${new Date(update.lastChecked).toLocaleString('en-US')}` : '';
  const cached = update.cached ? 'Cached result: ' : '';
  $('updateStatus').textContent = update.error ?
    (href ? `The latest check failed; version ${update.latestVersion} was found earlier.` :
      update.error === 'rate_limit' ? 'GitHub temporarily limited requests. Try again later.' :
        update.error === 'response' ? 'The update response was invalid. Try again later.' : 'Could not check for updates. Check your internet connection.') + checked :
    href ? cached + `Version ${update.latestVersion} is available.` + checked :
      update.lastChecked ? cached + 'Your version is up to date.' + checked :
        update.automaticChecks === false ? 'Use Check for updates to look for a new version.' :
          'Updates are checked every 3 days. You can also check now.';
  if (update.automaticChecks === false || update.notificationsAvailable === false) {
    $('updateStatus').textContent += ' Scheduling or notifications are unavailable in this installation. Manual checks still work. Replace the complete extension package and reload the extension.';
  }
}

async function checkUpdates() {
  $('checkUpdates').disabled = true;
  $('updateStatus').textContent = 'Checking for updates…';
  try { renderUpdate((await send({ type: 'checkForUpdates' })).update); }
  catch { $('updateStatus').textContent = 'Could not check for updates. Try again.'; }
  finally { $('checkUpdates').disabled = false; }
}
$('checkUpdates').addEventListener('click', checkUpdates);

(async () => {
  try {
    $('version').textContent = `v${api.runtime.getManifest().version}`;
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    host = tab?.url && /^https?:/.test(tab.url) ? AdBlockSettings.hostname(tab.url) : null;
    url = AdBlockSettings.pageUrl(tab?.url);
    $('host').textContent = host || 'This page is not supported';
    $('url').textContent = url || 'This page is not supported';
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
    catch { $('updateStatus').textContent = 'Select Check for updates to check your version.'; }
  } catch (error) { $('message').textContent = error.message; }
})();
