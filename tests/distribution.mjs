import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root));
const json = async relative => JSON.parse(await read(relative));

for (const browser of ['chrome', 'edge', 'firefox']) {
  test(`${browser}: complete manifest, safe rules, valid icons, source and license included`, async () => {
    const base = `dist/${browser}/`;
    const manifest = await json(`${base}manifest.json`);
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.version, (await json('package.json')).version);
    assert.equal(manifest.permissions.includes('declarativeNetRequest'), true);
    const paths = [manifest.action.default_popup, ...Object.values(manifest.icons),
      ...manifest.content_scripts.flatMap(script => script.js),
      ...manifest.declarative_net_request.rule_resources.map(rule => rule.path),
      ...(manifest.background.scripts || [manifest.background.service_worker])];
    for (const file of paths) assert.ok((await read(base + file)).length > 0, file);
    if (browser === 'firefox') assert.equal(manifest.background.service_worker, undefined);
    else assert.equal(manifest.background.service_worker, 'background.js');
    for (const file of ['settings.js', 'background.js', 'content.js', 'popup.js', 'popup.css', 'popup.html', 'theme.js']) {
      assert.deepEqual(await read(base + file), await read('extension/' + file));
    }
    assert.deepEqual(await read(base + 'LICENSE.txt'), await read('LICENSE'));
    for (const file of ['PRIVACY.md', 'PRIVACY.en.md', 'SECURITY.md', 'SECURITY.en.md']) {
      assert.deepEqual(await read(base + file), await read(file));
    }
    const rules = await json(base + 'rules/ads.json');
    const domains = await json('extension/ad-domains.json');
    assert.equal(rules.length, domains.length);
    assert.equal(new Set(rules.map(rule => rule.id)).size, rules.length);
    assert.deepEqual(rules.map(rule => rule.condition.requestDomains[0]), domains);
    for (const rule of rules) {
      assert.equal(rule.action.type, 'block');
      assert.equal(rule.condition.domainType, 'thirdParty');
      assert.equal(rule.condition.resourceTypes.includes('main_frame'), false);
      assert.equal(rule.priority, 1);
    }
    for (const size of [16, 32, 48, 128]) {
      const png = await read(`${base}icons/${size}.png`);
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
      const chunks = [];
      for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset);
        if (png.subarray(offset + 4, offset + 8).toString() === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
        offset += length + 12;
      }
      assert.equal(inflateSync(Buffer.concat(chunks)).length, size * (1 + 4 * size));
    }
  });
}
test('all ZIPs are intact, match generated files, include license and exclude development dependencies', () => {
  const result = spawnSync('python3', ['-c', `
from pathlib import Path
from zipfile import ZipFile
root=Path.cwd()
for browser in ('chrome','edge','firefox'):
    folder=root/'dist'/browser
    with ZipFile(root/'dist'/f'adblocker-{browser}-1.0.0.zip') as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {str(file.relative_to(folder)) for file in folder.rglob('*') if file.is_file()}
        assert 'manifest.json' in archive.namelist()
        assert 'LICENSE.txt' in archive.namelist()
        assert not any('node_modules' in name for name in archive.namelist())
        for name in archive.namelist():
            assert archive.read(name) == (folder/name).read_bytes()
`], { cwd: fileURLToPath(root), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

import { fileURLToPath } from 'node:url';
