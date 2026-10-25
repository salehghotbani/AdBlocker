import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
for (const dir of ['extension', 'scripts', 'tests']) {
  for (const file of await readdir(path.join(root, dir))) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(root, dir, file)], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `Failed syntax check: ${file}`);
    count++;
  }
}
// Catch broken relative links and missing README screenshots before publishing.
for (const file of ['README.md', 'PRIVACY.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'docs/TESTING.md']) {
  const text = await readFile(path.join(root, file), 'utf8');
  const targets = [...text.matchAll(/\]\(([^)]+)\)|src="([^"]+)"/g)].map(match => match[1] || match[2]);
  for (const target of targets) {
    if (/^(https?:|#)/.test(target)) continue;
    await access(path.resolve(root, path.dirname(file), target.split('#')[0]));
  }
}
console.log(`PASS: syntax of ${count} JavaScript files and local documentation links`);
