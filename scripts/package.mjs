import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3',
  [fileURLToPath(new URL('package.py', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
