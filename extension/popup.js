const api = globalThis.browser || chrome;
const $ = id => document.getElementById(id);
let tab;
let host;
let settings;
let busy = false;

function render() {
  const allowed = host && AdBlockSettings.isAllowed(host, settings.allowedSites);
  const on = settings.enabled && !allowed;
  $('enabled').checked = settings.enabled;
  $('enabled').disabled = busy;
  $('siteEnabled').checked = !allowed;
  $('siteEnabled').disabled = busy || !host || !settings.enabled;
  $('reload').disabled = busy || !host;
  $('clear').disabled = busy || !settings.allowedSites.length;
  $('count').textContent = `(${settings.allowedSites.length.toLocaleString('fa-IR')})`;
  $('status').textContent = !settings.enabled ? 'مسدودسازی خاموش است' :
    !host ? 'برای صفحات وب آماده است' : allowed ? 'این سایت در فهرست استثناهاست' : 'مسدودسازی فعال است';
  $('dot').classList.toggle('on', Boolean(on));
}

async function send(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || 'ارتباط با افزونه برقرار نشد.');
  return result.settings;
}

async function change(message) {
  busy = true;
  $('message').textContent = '';
  render();
  try {
    settings = await send(message);
    $('message').textContent = 'ذخیره شد. برای اعمال کامل تغییرات، سایت را دوباره بارگذاری کنید.';
  } catch (error) { $('message').textContent = error.message; }
  finally { busy = false; render(); }
}

$('enabled').addEventListener('change', () => change({ type: 'setEnabled', enabled: $('enabled').checked }));
$('siteEnabled').addEventListener('change', () => change({ type: 'setSite', host, allowed: !$('siteEnabled').checked }));
$('clear').addEventListener('click', () => change({ type: 'clearSites' }));
$('reload').addEventListener('click', async () => {
  try { await api.tabs.reload(tab.id); window.close(); }
  catch (error) { $('message').textContent = error.message; }
});

(async () => {
  try {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    host = tab?.url && /^https?:/.test(tab.url) ? AdBlockSettings.hostname(tab.url) : null;
    $('host').textContent = host || 'این صفحه پشتیبانی نمی‌شود';
    settings = await send({ type: 'getSettings' });
    render();
  } catch (error) { $('message').textContent = error.message; }
})();
