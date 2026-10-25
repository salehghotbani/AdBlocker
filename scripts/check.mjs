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
const documents = (await readdir(root, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.md')).map(entry => entry.name);
async function collectDocuments(dir) {
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectDocuments(relative);
    else if (entry.isFile() && entry.name.endsWith('.md')) documents.push(relative);
  }
}
await collectDocuments('docs');
for (const file of documents) {
  const text = await readFile(path.join(root, file), 'utf8');
  const targets = [...text.matchAll(/\]\(([^)]+)\)|src="([^"]+)"/g)].map(match => match[1] || match[2]);
  for (const target of targets) {
    if (/^(https?:|#)/.test(target)) continue;
    await access(path.resolve(root, path.dirname(file), target.split('#')[0]));
  }
}
console.log(`PASS: syntax of ${count} JavaScript files and local links in ${documents.length} Markdown files`);
