import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateSupport } from './support-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'extension');
const storeBuild = process.argv.includes('--store');
const support = validateSupport(JSON.parse(await readFile(path.join(root, 'config/support.json'), 'utf8')));
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const domains = JSON.parse(await readFile(path.join(source, 'ad-domains.json'), 'utf8'));
if (new Set(domains).size !== domains.length ||
    domains.some(domain => !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(domain))) {
  throw new Error('Invalid or duplicate advertising domain');
}
const rules = domains.map((domain, index) => ({
  id: index + 1,
  priority: 1,
  action: { type: 'block' },
  condition: {
    requestDomains: [domain],
    domainType: 'thirdParty',
    resourceTypes: ['script', 'image', 'stylesheet', 'font', 'media', 'xmlhttprequest',
      'sub_frame', 'ping', 'websocket', 'other']
  }
}));
// Ad-only script paths may be served by the page's own host. Match paths, not
// arbitrary "ads" substrings or ad URLs inside a useful script's query string.
rules.push({
  id: 10000,
  priority: 1,
  action: { type: 'block' },
  condition: {
    regexFilter: '^https?://[^/?#]+/([^?#]*/)?(pagead|widget/ads)(\\.[a-z0-9_-]+)?\\.js([?#]|$)',
    resourceTypes: ['script']
  }
});

const common = {
  manifest_version: 3,
  name: '__MSG_extensionName__',
  default_locale: 'en',
  incognito: 'not_allowed',
  version,
  description: '__MSG_extensionDescription__',
  permissions: ['storage', 'declarativeNetRequest', 'activeTab', 'webNavigation', ...(storeBuild ? [] : ['alarms', 'notifications'])],
  content_security_policy: { extension_pages:
    "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; connect-src https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest; frame-src 'none'; form-action 'none'; frame-ancestors 'none'" },
  host_permissions: ['http://*/*', 'https://*/*'],
  action: { default_popup: 'popup.html', default_title: 'AdBlocker', default_icon: {
    16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png'
  } },
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  content_scripts: [{ matches: ['http://*/*', 'https://*/*'],
    js: ['settings.js', 'content.js'], run_at: 'document_idle', all_frames: true }],
  declarative_net_request: { rule_resources: [{ id: 'ads', enabled: true, path: 'rules/ads.json' }] }
};

for (const browser of ['chrome', 'edge', 'firefox']) {
  const dest = path.join(root, 'dist', ...(storeBuild ? ['stores'] : []), browser);
  if (!path.resolve(dest).startsWith(path.join(root, 'dist') + path.sep)) throw new Error('Unexpected build directory');
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.join(dest, 'rules'), { recursive: true });
  await cp(path.join(source, 'icons'), path.join(dest, 'icons'), { recursive: true });
  await cp(path.join(source, 'fonts'), path.join(dest, 'fonts'), { recursive: true });
  await cp(path.join(source, '_locales'), path.join(dest, '_locales'), { recursive: true });
  for (const file of ['settings.js', 'updates.js', 'background.js', 'content.js', 'popup.html', 'popup.css', 'popup.js', 'theme.js', 'support.html', 'support.css', 'support.js', 'locale-data.js', 'i18n.js', 'fonts.css']) {
    await cp(path.join(source, storeBuild && file === 'updates.js' ? 'store-updates.js' : file), path.join(dest, file));
  }
  await writeFile(path.join(dest, 'distribution.js'), 'globalThis.AdBlockDistribution = Object.freeze(' +
    JSON.stringify({ channel: storeBuild ? browser : 'github', support }) + ');\n');
  await cp(path.join(root, 'LICENSE'), path.join(dest, 'LICENSE.txt'));
  for (const file of ['PRIVACY.md', 'PRIVACY.fa.md', 'PRIVACY.en.md', 'SECURITY.md', 'SECURITY.fa.md', 'SECURITY.en.md']) {
    await cp(path.join(root, file), path.join(dest, file));
  }
  const manifest = { ...common };
  if (storeBuild) {
    if (browser === 'firefox') for (const file of ['update-help.html', 'update-help.js']) await cp(path.join(source, file), path.join(dest, file));
    manifest.content_security_policy = { extension_pages: common.content_security_policy.extension_pages.replace(
      'connect-src https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest', "connect-src 'none'") };
    await cp(path.join(root, `store/${browser}/PRIVACY.md`), path.join(dest, 'PRIVACY.md'));
    await cp(path.join(root, `store/${browser}/PRIVACY.fa.md`), path.join(dest, 'PRIVACY.fa.md'));
  }
  if (browser === 'firefox') {
    manifest.background = { scripts: ['distribution.js', 'settings.js', 'updates.js', 'background.js'] };
    manifest.browser_specific_settings = { gecko: {
      id: 'adblocker@salehghotbani.local', strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] }
    }, gecko_android: { strict_min_version: '142.0' } };
  } else {
    manifest.minimum_chrome_version = '120';
    manifest.background = { service_worker: 'background.js' };
  }
  await writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(dest, 'rules', 'ads.json'), JSON.stringify(rules, null, 2) + '\n');
  console.log(`${browser}: ${rules.length} rules → ${path.relative(root, dest)}`);
}
