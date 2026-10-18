import hashlib
import json
import shutil
import urllib.request
import zipfile
from datetime import datetime, timezone

from config import CONFIG, local_path
from browser.permissions import prepare_runtime


def main() -> None:
    runtime = local_path("runtime_dir")
    runtime.mkdir(parents=True, exist_ok=True)
    archive = runtime / f"chromium-{CONFIG['revision']}.zip"
    url = f"{CONFIG['upstream_base']}/{CONFIG['revision']}/chrome-win.zip"
    if not archive.exists():
        temporary = archive.with_suffix(".partial")
        with urllib.request.urlopen(url, timeout=CONFIG['network_timeout_seconds']) as source:
            with temporary.open("wb") as destination:
                shutil.copyfileobj(source, destination)
        temporary.replace(archive)
    with archive.open("rb") as downloaded:
        digest = hashlib.file_digest(downloaded, "sha256").hexdigest()
    if digest != CONFIG["archive_sha256"]:
        raise ValueError("Downloaded archive differs from the pinned upstream artifact")
    with zipfile.ZipFile(archive) as package:
        for member in package.infolist():
            if not (runtime / member.filename).resolve().is_relative_to(runtime):
                raise ValueError("Unsafe archive member")
        package.extractall(runtime)
    executable = runtime / "chrome-win/chrome.exe"
    if not executable.is_file():
        raise RuntimeError("Chromium executable missing")
    prepare_runtime(executable.parent)
    manifest = {
        "kind": "unmodified_official_chromium_snapshot",
        "custom_source_build": False, "revision": CONFIG["revision"],
        "source_url": url, "archive_sha256": digest,
        "archive_bytes": archive.stat().st_size,
        "executable_sha256": hashlib.sha256(executable.read_bytes()).hexdigest(),
        "acquired_at": datetime.now(timezone.utc).isoformat(),
    }
    (runtime / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
