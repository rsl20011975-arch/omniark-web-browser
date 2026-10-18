import json
import subprocess
from datetime import datetime, timezone

from config import CONFIG, local_path


def main() -> None:
    runtime = local_path("runtime_dir")
    profile = local_path("profile_dir")
    evidence = local_path("evidence_dir")
    evidence.mkdir(parents=True, exist_ok=True)
    executable = runtime / "chrome-win/chrome.exe"
    if not executable.is_file():
        raise RuntimeError("Run python -m browser.acquire first")
    if (profile / "DevToolsActivePort").exists():
        raise RuntimeError("Existing endpoint file: inspect session before relaunch")
    arguments = [str(executable), f"--user-data-dir={profile}",
                 "--remote-debugging-port=0", "--no-first-run", CONFIG["start_url"]]
    process = subprocess.Popen(arguments)
    record = {"pid": process.pid, "started_at": datetime.now(timezone.utc).isoformat(),
              "arguments": arguments, "runtime": json.loads((runtime / "manifest.json").read_text())}
    (evidence / "launch.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps({"pid": process.pid, "profile": str(profile)}))


if __name__ == "__main__":
    main()
