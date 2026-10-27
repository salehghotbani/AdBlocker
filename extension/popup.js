const api = globalThis.browser || chrome;
const $ = id => document.getElementById(id);
let tab;
let host;
let settings;
let url;
let paused = false;
let busy = false;

function render() {
  const allowed = host && AdBlockSettings.isAllowed(host, settings.allowedSites);
  const urlAllowed = settings.allowedUrls.includes(url);
  const on = settings.enabled && !allowed && !urlAllowed && !paused;
  $('enabled').checked = settings.enabled;
  $('enabled').disabled = busy;
  $('siteEnabled').checked = !allowed;
  $('siteEnabled').disabled = busy || !host || !settings.enabled;
  $('urlEnabled').checked = !urlAllowed;
  $('urlEnabled').disabled = busy || !url || !settings.enabled || allowed;
  $('pause').disabled = busy || !url || (!paused && (!settings.enabled || allowed || urlAllowed));
  $('pause').textContent = paused ? 'ادامهٔ مسدودسازی و بارگذاری مجدد' : 'توقف این بار و بارگذاری مجدد';
  $('clearUrls').disabled = busy || !settings.allowedUrls.length;
  $('urlCount').textContent = `(${settings.allowedUrls.length.toLocaleString('fa-IR')})`;
  $('reload').disabled = busy || !host;
  $('clear').disabled = busy || !settings.allowedSites.length;
  $('count').textContent = `(${settings.allowedSites.length.toLocaleString('fa-IR')})`;
  $('status').textContent = !settings.enabled ? 'مسدودسازی خاموش است' :
    !host ? 'برای صفحات وب آماده است' : allowed ? 'این سایت در فهرست استثناهاست' :
      urlAllowed ? 'این URL همیشه مستثناست' : paused ? 'توقف موقت برای همین صفحه' : 'مسدودسازی فعال است';
  $('dot').classList.toggle('on', Boolean(on));
}

async function send(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || 'ارتباط با افزونه برقرار نشد.');
  return result;
}

async function change(message) {
  busy = true;
  $('message').textContent = '';
  render();
  try {
    const result = await send(message);
    settings = AdBlockSettings.normalize(result.settings);
    if (typeof result.paused === 'boolean') paused = result.paused;
    $('message').textContent = message.type === 'setPause' ?
      (paused ? 'توقف یک‌باره فعال شد. بارگذاری بعدی یا خروج از صفحه آن را پایان می‌دهد.' : 'مسدودسازی دوباره فعال شد.') :
      'ذخیره شد. برای اعمال کامل تغییرات، سایت را دوباره بارگذاری کنید.';
  } catch (error) { $('message').textContent = error.message; }
  finally { busy = false; render(); }
}

$('enabled').addEventListener('change', () => change({ type: 'setEnabled', enabled: $('enabled').checked }));
$('siteEnabled').addEventListener('change', () => change({ type: 'setSite', host, allowed: !$('siteEnabled').checked }));
$('clear').addEventListener('click', () => change({ type: 'clearSites' }));
$('urlEnabled').addEventListener('change', () => change({ type: 'setUrl', url, allowed: !$('urlEnabled').checked }));
$('clearUrls').addEventListener('click', () => change({ type: 'clearUrls' }));
$('pause').addEventListener('click', () => change({ type: 'setPause', tabId: tab.id, url, paused: !paused }));
$('reload').addEventListener('click', async () => {
  try { await api.tabs.reload(tab.id); window.close(); }
  catch (error) { $('message').textContent = error.message; }
});

(async () => {
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    host = tab?.url && /^https?:/.test(tab.url) ? AdBlockSettings.hostname(tab.url) : null;
    url = AdBlockSettings.pageUrl(tab?.url);
    $('host').textContent = host || 'این صفحه پشتیبانی نمی‌شود';
    $('url').textContent = url || 'این صفحه پشتیبانی نمی‌شود';
    const result = await send({ type: 'getSettings', tabId: tab?.id });
    settings = AdBlockSettings.normalize(result.settings);
    paused = result.paused === true;
    render();
  } catch (error) { $('message').textContent = error.message; }
})();
