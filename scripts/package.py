"""Package generated extensions with manifest.json at the ZIP root (not signed)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
for browser in ("chrome", "edge", "firefox"):
    folder = root / "dist" / browser
    target = root / "dist" / f"adblocker-{browser}-1.0.0.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for file in sorted(folder.rglob("*")):
            if file.is_file():
                archive.write(file, file.relative_to(folder))
    print(target.relative_to(root))
