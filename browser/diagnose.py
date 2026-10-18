"""Read local runtime metadata; never captures page contents or performs UI input."""
import argparse
import json
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlsplit

from config import CONFIG, local_path

def read_metadata(port: int, route: str):
    if not 1 <= port <= 65535:
        raise ValueError("Invalid loopback port")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/{route}", timeout=10) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True, type=int)
    args = parser.parse_args()
    version = read_metadata(args.port, "json/version")
    targets = read_metadata(args.port, "json/list")
    if not isinstance(version, dict) or not isinstance(targets, list):
        raise ValueError("Unexpected diagnostic response")
    pages = []
    for target in targets:
        if target.get("type") != "page":
            continue
        url = urlsplit(target.get("url", ""))
        if url.hostname not in CONFIG["diagnostic_hosts"]:
            continue
        pages.append({"origin": f"{url.scheme}://{url.netloc}", "path": url.path,
                      "title": target.get("title", "")})
    state = {"at": datetime.now(timezone.utc).isoformat(),
             "version": version.get("Browser"), "pages": pages,
             "evidence_scope": "target metadata only; no visual or auth success assertion"}
    destination = local_path("evidence_dir") / "runtime-status.json"
    destination.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(state, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
