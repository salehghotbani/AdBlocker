import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'extension');
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

const common = {
  manifest_version: 3,
  name: 'AdBlocker — مرور بدون تبلیغ',
  version: '1.0.0',
  description: 'مسدودسازی محافظه‌کارانهٔ تبلیغات، با امکان استثناکردن سایت‌ها و بدون ردیابی.',
  permissions: ['storage', 'declarativeNetRequest', 'activeTab', 'webNavigation'],
  host_permissions: ['http://*/*', 'https://*/*'],
  action: { default_popup: 'popup.html', default_title: 'AdBlocker', default_icon: {
    16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png'
  } },
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  content_scripts: [{ matches: ['http://*/*', 'https://*/*'],
    js: ['settings.js', 'content.js'], run_at: 'document_idle', all_frames: true }],
  declarative_net_request: { rule_resources: [{ id: 'ads', enabled: true, path: 'rules/ads.json' }] }
};

// Generate small PNG icons using only Node built-ins (no downloaded artwork).
const { deflateSync } = await import('node:zlib');
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([size, body, crc]);
}
function icon(size) {
  const rows = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + .5) / size, ny = (y + .5) / size;
    const inside = ny > .08 && ny < .92 && Math.abs(nx - .5) <
      (ny < .52 ? .35 : .35 * Math.sqrt((.92 - ny) / .4));
    const tick = inside && ((nx > .28 && nx < .46 && Math.abs(ny - (nx + .13)) < .045) ||
      (nx >= .46 && nx < .74 && Math.abs(ny - (1.05 - nx)) < .045));
    const offset = y * (1 + size * 4) + 1 + x * 4;
    rows.set(tick ? [16, 23, 34, 255] : inside ? [45, 212, 163, 255] : [0, 0, 0, 0], offset);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

for (const browser of ['chrome', 'edge', 'firefox']) {
  const dest = path.join(root, 'dist', browser);
  await rm(dest, { recursive: true, force: true });
  await mkdir(path.join(dest, 'rules'), { recursive: true });
  await mkdir(path.join(dest, 'icons'), { recursive: true });
  for (const file of ['settings.js', 'background.js', 'content.js', 'popup.html', 'popup.css', 'popup.js']) {
    await cp(path.join(source, file), path.join(dest, file));
  }
  await cp(path.join(root, 'LICENSE'), path.join(dest, 'LICENSE.txt'));
  for (const file of ['PRIVACY.md', 'PRIVACY.en.md', 'SECURITY.md', 'SECURITY.en.md']) {
    await cp(path.join(root, file), path.join(dest, file));
  }
  const manifest = { ...common };
  if (browser === 'firefox') {
    manifest.background = { scripts: ['settings.js', 'background.js'] };
    manifest.browser_specific_settings = { gecko: {
      id: 'adblocker@salehghotbani.local', strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] }
    }, gecko_android: { strict_min_version: '142.0' } };
  } else {
    manifest.minimum_chrome_version = '120';
    manifest.background = { service_worker: 'background.js' };
  }
  for (const size of [16, 32, 48, 128]) await writeFile(path.join(dest, 'icons', `${size}.png`), icon(size));
  await writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(dest, 'rules', 'ads.json'), JSON.stringify(rules, null, 2) + '\n');
  console.log(`${browser}: ${rules.length} rules → ${path.relative(root, dest)}`);
}
