import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const source = JSON.parse(await readFile(new URL('localization/translations.json', root), 'utf8'));
test('ten complete supported languages preserve substitutions; no Hebrew locale is included', async () => {
  assert.deepEqual(source.languages.map(item => item.code), ['en', 'fa', 'ar', 'es', 'fr', 'de', 'pt-BR', 'zh-CN', 'ja', 'tr']);
  assert.equal(source.languages[0].code, 'en');
  for (const row of source.rows) {
    assert.equal(row.length, 10);
    const params = text => [...text.matchAll(/\{([a-z]+)\}/g)].map(item => item[1]).sort();
    for (const value of row) { assert.ok(value.trim()); assert.deepEqual(params(value), params(row[0])); }
  }
  const keys = new Set(source.rows.map(row => row[0]));
  for (const file of ['popup.js', 'theme.js', 'support.js']) {
    const code = await readFile(new URL('extension/' + file, root), 'utf8');
    for (const match of code.matchAll(/\bt\('((?:\\.|[^'\\])*)'/g)) {
      assert.ok(keys.has(match[1].replace(/\\'/g, "'")), `Missing localization for ${file}: ${match[1]}`);
    }
  }
});
test('generated local dictionaries and store descriptions match their auditable source', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/localize.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
