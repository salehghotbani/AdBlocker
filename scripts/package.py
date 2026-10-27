"""Package generated extensions with manifest.json at the ZIP root (not signed)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
for browser in ("chrome", "edge", "firefox"):
    folder = root / "dist" / browser
    target = root / "dist" / f"adblocker-{browser}-{version}.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for file in sorted(folder.rglob("*")):
            # Chromium may cache compiled rules inside an unpacked extension.
            # That browser-generated directory must never enter a release ZIP.
            if file.is_file() and "_metadata" not in file.relative_to(folder).parts:
                archive.write(file, file.relative_to(folder))
    print(target.relative_to(root))
