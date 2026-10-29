"""Package generated extensions with manifest.json at the ZIP root (not signed)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import sys
from tempfile import NamedTemporaryFile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
store = "--store" in sys.argv
output = root / "dist" / "stores" if store else root / "dist"
for browser in ("chrome", "edge", "firefox"):
    folder = output / browser
    target = output / f"adblocker-{browser}-{'store-' if store else ''}{version}.zip"
    # Stage beside the destination; an interrupted build must not truncate a
    # previously valid ZIP, and Windows readers may keep that old file mapped.
    with NamedTemporaryFile(prefix=f".adblocker-{browser}-", suffix=".zip.tmp", dir=output, delete=False) as handle:
        staged = Path(handle.name)
    try:
        with ZipFile(staged, "w", ZIP_DEFLATED) as archive:
            for file in sorted(folder.rglob("*")):
                if file.is_file() and "_metadata" not in file.relative_to(folder).parts:
                    archive.write(file, file.relative_to(folder))
        staged.replace(target)
    finally:
        staged.unlink(missing_ok=True)
    print(target.relative_to(root))
