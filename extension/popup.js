const api = globalThis.browser || chrome;
const $ = id => document.getElementById(id);
let tab;
let host;
let settings;
let url;
let paused = false;
let busy = false;

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
  $('pauseLabel').textContent = paused ? 'ادامهٔ مسدودسازی و بارگذاری مجدد' : 'توقف این بار و بارگذاری مجدد';
  $('totalCount').textContent = (settings.allowedSites.length + settings.allowedUrls.length).toLocaleString('fa-IR');
  $('clearUrls').disabled = busy || !settings.allowedUrls.length;
  $('urlCount').textContent = `(${settings.allowedUrls.length.toLocaleString('fa-IR')})`;
  $('reload').disabled = busy || !host;
  $('clear').disabled = busy || !settings.allowedSites.length;
  $('count').textContent = `(${settings.allowedSites.length.toLocaleString('fa-IR')})`;
  $('status').textContent = !settings.enabled ? 'مسدودسازی خاموش است' :
    !host ? 'برای صفحات وب آماده است' : allowed ? 'این سایت در فهرست استثناهاست' :
      urlAllowed ? 'این URL همیشه مستثناست' : paused ? 'توقف موقت برای همین صفحه' : 'مسدودسازی فعال است';
  $('dot').classList.toggle('on', Boolean(on));
  $('protection').dataset.state = on ? 'on' : 'off';
  document.documentElement.dataset.protection = on ? 'on' : 'off';
  $('statusHint').textContent = !settings.enabled ? 'هر وقت خواستید، دوباره روشن کنید.' :
    !host ? 'کنترل‌ها در صفحه‌های وب فعال می‌شوند.' : on ? 'فیلترهای تبلیغ برای این صفحه فعال‌اند.' : 'فیلترها برای این صفحه متوقف شده‌اند.';
}

async function send(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || 'ارتباط با افزونه برقرار نشد.');
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
      (paused ? 'توقف یک‌باره فعال شد. بارگذاری بعدی یا خروج از صفحه آن را پایان می‌دهد.' : 'مسدودسازی دوباره فعال شد.') :
      reloaded ? 'ذخیره شد و صفحه خودکار دوباره بارگذاری شد.' : 'تنظیمات ذخیره شد.';
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
  try {
    if (await reloadCurrentPage()) window.close();
    else $('message').textContent = 'صفحه عوض شده است؛ پنجرهٔ افزونه را دوباره باز کنید.';
  }
  catch (error) { $('message').textContent = error.message; }
});

function renderUpdate(update) {
  $('updateSchedule').textContent = update.automaticChecks === false ? 'بررسی دستی' : 'خودکار هر ۳ روز';
  const href = update.available && AdBlockUpdates.releaseUrl(update.latestTag);
  $('updateLink').hidden = !href;
  if (href) $('updateLink').href = href;
  else $('updateLink').removeAttribute('href');
  const checked = update.lastChecked ? ` آخرین بررسی موفق: ${new Date(update.lastChecked).toLocaleString('fa-IR')}` : '';
  const cached = update.cached ? 'نتیجهٔ آخرین بررسی: ' : '';
  $('updateStatus').textContent = update.error ?
    (href ? `بررسی تازه انجام نشد؛ نسخهٔ ${update.latestVersion} قبلاً پیدا شده است.` :
      update.error === 'rate_limit' ? 'GitHub موقتاً درخواست را نپذیرفت؛ بعداً دوباره بررسی کنید.' :
        update.error === 'response' ? 'پاسخ معتبر برای به‌روزرسانی دریافت نشد؛ بعداً دوباره بررسی کنید.' : 'بررسی انجام نشد؛ اتصال اینترنت را بررسی کنید.') + checked :
    href ? cached + `نسخهٔ ${update.latestVersion} آمادهٔ دریافت است.` + checked :
      update.lastChecked ? cached + 'نسخهٔ شما به‌روز است.' + checked :
        update.automaticChecks === false ? 'با دکمهٔ بررسی به‌روزرسانی، نسخهٔ جدید را بررسی کنید.' :
          'بررسی خودکار هر ۳ روز انجام می‌شود؛ می‌توانید همین حالا هم بررسی کنید.';
  if (update.automaticChecks === false || update.notificationsAvailable === false) {
    $('updateStatus').textContent += ' زمان‌بندی یا اعلان در این نصب در دسترس نیست؛ بررسی دستی فعال است. بستهٔ کامل افزونه را جایگزین و خود افزونه را Reload کنید.';
  }
}

async function checkUpdates() {
  $('checkUpdates').disabled = true;
  $('updateStatus').textContent = 'در حال بررسی نسخهٔ جدید…';
  try { renderUpdate((await send({ type: 'checkForUpdates' })).update); }
  catch { $('updateStatus').textContent = 'بررسی به‌روزرسانی انجام نشد؛ دوباره تلاش کنید.'; }
  finally { $('checkUpdates').disabled = false; }
}
$('checkUpdates').addEventListener('click', checkUpdates);

(async () => {
  try {
    $('version').textContent = `v${api.runtime.getManifest().version}`;
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    host = tab?.url && /^https?:/.test(tab.url) ? AdBlockSettings.hostname(tab.url) : null;
    url = AdBlockSettings.pageUrl(tab?.url);
    $('host').textContent = host || 'این صفحه پشتیبانی نمی‌شود';
    $('url').textContent = url || 'این صفحه پشتیبانی نمی‌شود';
    $('url').title = url || '';
    const result = await send({ type: 'getSettings', tabId: tab?.id });
    settings = AdBlockSettings.normalize(result.settings);
    paused = result.paused === true;
    render();
    try { renderUpdate((await send({ type: 'getUpdateStatus' })).update); }
    catch { $('updateStatus').textContent = 'برای بررسی نسخه، دکمهٔ بررسی به‌روزرسانی را بزنید.'; }
  } catch (error) { $('message').textContent = error.message; }
})();
