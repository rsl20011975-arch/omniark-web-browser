import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "config/probe.json").read_text(encoding="utf-8"))


def local_path(key: str) -> Path:
    path = (ROOT / CONFIG[key]).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"Path escapes project: {key}")
    return path
