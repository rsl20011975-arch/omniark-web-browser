"""Grant Chromium's Windows app containers RX on public runtime files only."""
import os
import subprocess
from pathlib import Path

from config import CONFIG, local_path


def prepare_runtime(executable_dir: Path) -> None:
    if os.name != "nt":
        return
    expected = (local_path("runtime_dir") / "chrome-win").resolve()
    if executable_dir.resolve() != expected or not (expected / "chrome.exe").is_file():
        raise ValueError("Permission setup is restricted to the installed Chromium runtime")
    evidence = local_path("evidence_dir")
    evidence.mkdir(parents=True, exist_ok=True)
    backup = evidence / "runtime-acl-install-before.txt"
    if not backup.exists():
        subprocess.run(["icacls", str(expected), "/save", str(backup), "/T", "/Q"], check=True)
        if not backup.is_file() or backup.stat().st_size == 0:
            raise RuntimeError("Runtime ACL backup is empty")
    grants = [f"*{sid}:(OI)(CI)(RX)" for sid in CONFIG["runtime_read_execute_sids"]]
    subprocess.run(["icacls", str(expected), "/grant", *grants, "/T", "/Q"], check=True)


if __name__ == "__main__":
    prepare_runtime(local_path("runtime_dir") / "chrome-win")
