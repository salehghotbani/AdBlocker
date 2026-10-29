import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { validateSupport } from '../scripts/support-config.mjs';
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
for (const browser of ['chrome', 'edge', 'firefox']) test(`${browser}: store package has no external updater or unnecessary update permissions`, async () => {
  const base = `dist/stores/${browser}/`;
  const manifest = JSON.parse(await read(base + 'manifest.json'));
  assert.deepEqual(manifest.permissions, ['storage', 'declarativeNetRequest', 'activeTab', 'webNavigation']);
  assert.ok(manifest.content_security_policy.extension_pages.includes("connect-src 'none'"));
  assert.equal(/https?:/.test(manifest.content_security_policy.extension_pages), false);
  assert.equal(manifest.update_url, undefined);
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.incognito, 'not_allowed');
  if (browser === 'edge') assert.equal(/Firefox|Chrome/i.test(await read(base + 'PRIVACY.md')), false);
  assert.equal(manifest.browser_specific_settings?.gecko.update_url, undefined);
  if (browser === 'firefox') assert.equal(manifest.browser_specific_settings.gecko_android.strict_min_version, '142.0',
    'Android compatibility metadata keeps the data-consent minimum valid; no Android listing is claimed');
  assert.equal(await read(base + 'updates.js'), await read('extension/store-updates.js'));
  for (const file of ['background.js', 'content.js', 'youtube.js', 'youtube.css', 'popup.js', 'popup.html', 'support.js', 'support.html', 'support.css', 'locale-data.js', 'i18n.js', 'fonts.css']) {
    assert.equal(await read(base + file), await read('extension/' + file));
  }
  const youtube = manifest.content_scripts.find(script => script.js.includes('youtube.js'));
  assert.deepEqual(youtube.matches, ['https://www.youtube.com/*','https://www.youtube-nocookie.com/embed/*']);
  assert.equal(youtube.run_at,'document_start');
  assert.notEqual(youtube.world,'MAIN');
  assert.deepEqual(youtube.css,['youtube.css']);
  for (const font of ['InterVariable.woff2', 'Shabnam.woff2', 'Shabnam-Bold.woff2']) {
    const bytes = await readFile(new URL(base + 'fonts/' + font, root));
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    assert.deepEqual(bytes, await readFile(new URL('extension/fonts/' + font, root)));
  }
  for (const name of ['LICENSE-Inter.txt', 'LICENSE-Shabnam.txt', 'LICENSE-Apache-2.0.txt']) assert.ok((await read(base + 'fonts/' + name)).length > 1000);
  for (const language of ['en', 'fa', 'ar', 'es', 'fr', 'de', 'pt_BR', 'zh_CN', 'ja', 'tr']) {
    const messages = JSON.parse(await read(base + `_locales/${language}/messages.json`));
    assert.ok(messages.extensionName.message); assert.ok(messages.extensionDescription.message.length <= 132);
  }
  const context = vm.createContext({}); vm.runInContext(await read(base + 'distribution.js'), context);
  assert.equal(context.AdBlockDistribution.channel, browser);
  assert.equal(JSON.stringify(context.AdBlockDistribution.support), JSON.stringify(validateSupport(JSON.parse(await read('config/support.json')))));
  assert.equal(await read(base + 'PRIVACY.md'), await read(`store/${browser}/PRIVACY.md`));
  assert.equal(await read(base + 'PRIVACY.fa.md'), await read(`store/${browser}/PRIVACY.fa.md`));
  assert.equal(await read(base + 'rules/ads.json'), await read(`dist/${browser}/rules/ads.json`));
  if (browser === 'firefox') assert.match(await read(base + 'update-help.html'), /Manage browser updates/);
});
test('store ZIPs match complete built folders and exclude local browser caches', () => {
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `
from pathlib import Path
from zipfile import ZipFile
import json
root=Path.cwd(); version=json.loads((root/'package.json').read_text())['version']
for browser in ('chrome','edge','firefox'):
    folder=root/'dist'/'stores'/browser
    with ZipFile(root/'dist'/'stores'/f'adblocker-{browser}-store-{version}.zip') as archive:
        assert archive.testzip() is None
        expected={p.relative_to(folder).as_posix() for p in folder.rglob('*') if p.is_file() and '_metadata' not in p.parts}
        assert set(archive.namelist())==expected
        for name in expected: assert archive.read(name)==(folder/name).read_bytes()
        assert 'support.html' in expected and 'distribution.js' in expected and 'manifest.json' in expected
        assert not any('node_modules' in p or '_metadata' in p or p.startswith('test-') for p in expected)
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test('listing images have official dimensions and metadata does not claim paid capabilities or store approval', async () => {
  const metadata = JSON.parse(await read('store/metadata.json'));
  assert.equal(metadata.defaultLanguage, 'en');
  assert.equal(metadata.price, 'free'); assert.equal(metadata.requiredPayment, false);
  assert.ok(metadata.summary.length <= 132);
  for (const [names, width, height] of [
    [[...metadata.screenshots, ...metadata.firefoxScreenshots], 1280, 800],
    [[metadata.icon], 128, 128], [['icon-64.png'],64,64], [['icon-300.png'],300,300], [[metadata.smallPromo], 440, 280], [[metadata.marqueePromo], 1400, 560]
  ]) for (const name of names) {
    const bytes = await readFile(new URL(`store/assets/${name}`, root));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), width, name); assert.equal(bytes.readUInt32BE(20), height, name);
  }
});

test('submission fields match manifests/locales, satisfy Edge lengths and keep the approved public contact', async () => {
  const current=JSON.parse(await read('package.json')).version;
  for(const browser of ['chrome','edge','firefox']){
    const fields=JSON.parse(await read(`store/${browser}/DASHBOARD.json`));
    const manifest=JSON.parse(await read(`dist/stores/${browser}/manifest.json`));
    assert.equal(fields.version,current);assert.equal(fields.publicationStatus,browser==='chrome'?'deferred_by_owner':'not_submitted');
    assert.deepEqual(fields.publisher.publicationTargets,['edge','firefox']);
    assert.equal(fields.publisher.displayName,'saleh ghotbani');
    assert.equal(fields.publisher.publicSupportEmail,null);assert.equal(fields.publisher.allowPublicEmail,false);
    assert.equal(fields.supportWebsite,'https://github.com/salehghotbani/AdBlocker/issues');
    assert.equal(fields.remoteCode.used,false);assert.equal(fields.financialSupportConfigured,false);
    assert.deepEqual(Object.keys(fields.permissionJustifications).filter(name=>name!=='hostAccess').sort(),[...manifest.permissions].sort());
    assert.equal(Object.keys(fields.locales).length,10);
    for(const [locale,listing] of Object.entries(fields.locales)){
      const messages=JSON.parse(await read(`dist/stores/${browser}/_locales/${locale.replace('-','_')}/messages.json`));
      assert.equal(listing.name,messages.extensionName.message);assert.equal(listing.summary,messages.extensionDescription.message);
      assert.ok(listing.description.length>=250&&listing.description.length<=10000,`${browser}/${locale} description`);
    }
    if(browser==='chrome'){
      assert.deepEqual(fields.ownerActionsRequired,[]);
      assert.ok(fields.publicationBlockers.some(text=>text.includes('Do not submit')));
    }
    for(const name of [...fields.screenshotFiles,fields.iconFile])assert.ok((await readFile(new URL('store/'+name,root))).length>0,name);
  }
  const generated=spawnSync(process.execPath,['scripts/store-fields.mjs','--check'],{encoding:'utf8'});
  assert.equal(generated.status,0,generated.stderr);
});
