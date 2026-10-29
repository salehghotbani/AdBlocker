// Rebuild the reviewer archive without node_modules or network access, then
// compare every produced upload file with the actual submission ZIP contents.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', String.raw`
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from hashlib import sha256
import json, subprocess, sys
root=Path.cwd()
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
targets=json.loads((root/'store'/'publisher.json').read_text(encoding='utf-8'))['publicationTargets']
folder=root/'dist'/'stores'
cache=root/'.cache'/'reviewer-rebuild'
cache.mkdir(parents=True,exist_ok=True)
with TemporaryDirectory(prefix='source-',dir=cache) as temporary:
    target=Path(temporary).resolve()
    assert target.parent==cache.resolve()
    with ZipFile(folder/f'adblocker-reviewer-source-{version}.zip') as source:
        assert source.testzip() is None
        assert 'README-REVIEWER.md' in source.namelist()
        for name in source.namelist():
            assert (target/name).resolve().is_relative_to(target), name
            assert 'node_modules' not in Path(name).parts and '.git' not in Path(name).parts
        source.extractall(target)
    for script,args in [('scripts/localize.mjs',['--check']),('scripts/store-fields.mjs',['--check']),('scripts/build.mjs',['--store'])]:
        process=subprocess.run([sys.argv[1],script,*args],cwd=target,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        assert process.returncode==0, process.stdout+process.stderr
    assert not (target/'node_modules').exists()
    for browser in ('chrome','edge','firefox'):
        rebuilt=target/'dist'/'stores'/browser
        with ZipFile(folder/f'adblocker-{browser}-store-{version}.zip') as upload:
            names={p.relative_to(rebuilt).as_posix() for p in rebuilt.rglob('*') if p.is_file()}
            assert set(upload.namelist())==names, browser
            for name in names: assert upload.read(name)==(rebuilt/name).read_bytes(), (browser,name)
kit=folder/f'adblocker-submission-kit-{version}.zip'
with ZipFile(kit) as archive:
    assert archive.testzip() is None
    assert 'START-HERE.md' in archive.namelist()
    for browser in ('chrome','edge','firefox'):
        assert (f'{browser}/DASHBOARD.json' in archive.namelist()) == (browser in targets)
        assert (f'adblocker-{browser}-store-{version}.zip' in archive.namelist()) == (browser in targets)
    for line in archive.read(f'SHA256SUMS-submission-{version}.txt').decode().splitlines():
        expected,name=line.split('  ',1)
        assert sha256(archive.read(name)).hexdigest()==expected, name
assert kit.with_suffix('.zip.sha256').read_text(encoding='utf-8').split()[0]==sha256(kit.read_bytes()).hexdigest()
print('PASS: offline reviewer-source rebuild matches all three store uploads byte for byte; kit integrity and checksum verified')
`, process.execPath], { encoding: 'utf8', timeout: 60000 });
assert.equal(result.status, 0, result.stderr || result.error?.message);
process.stdout.write(result.stdout);
