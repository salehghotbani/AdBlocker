"""Assemble reviewer source and a separate, clearly named submission kit."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json
root = Path(__file__).resolve().parents[1]
version = json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
dest = root/'dist'/'stores'
assert dest.resolve().is_relative_to((root/'dist').resolve())
source = dest/f'adblocker-reviewer-source-{version}.zip'
with ZipFile(source, 'w', ZIP_DEFLATED) as archive:
    for folder in ('extension','scripts','tests','config','docs','store','localization'):
        for file in sorted((root/folder).rglob('*')):
            if file.is_file(): archive.write(file, file.relative_to(root))
    for file in list(root.glob('*.md')) + [root/'package.json', root/'package-lock.json', root/'LICENSE']:
        archive.write(file, file.name)
    archive.writestr('README-REVIEWER.md', (root/'store'/'BUILD.md').read_text(encoding='utf-8').replace('../docs/TESTING.md','docs/TESTING.md'))
assets = [dest/f'adblocker-{browser}-store-{version}.zip' for browser in ('chrome','edge','firefox')] + [source]
for file in assets: assert file.is_file(), file
sums = dest/f'SHA256SUMS-stores-{version}.txt'
sums.write_text(''.join(f'{sha256(file.read_bytes()).hexdigest()}  {file.name}\n' for file in assets), encoding='utf-8')
kit = dest/f'adblocker-submission-kit-{version}.zip'
with ZipFile(kit, 'w', ZIP_DEFLATED) as archive:
    archive.write(root/'store'/'SUBMISSION.md', 'START-HERE.md')
    for file in assets + [sums]: archive.write(file, file.name)
    for file in sorted((root/'store').rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(root/'store'))
    archive.write(root/'SUPPORT.md', 'SUPPORT.md')
kit.with_suffix('.zip.sha256').write_text(f'{sha256(kit.read_bytes()).hexdigest()}  {kit.name}\n', encoding='utf-8')
print(kit.relative_to(root))
print(sums.relative_to(root))
