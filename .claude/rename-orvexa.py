"""One-shot rename script: TableFlow -> Orvexa.

Walks the repo and applies brand-rename replacements to text files, while:
  * preserving the `tableflow.tn` domain placeholder (user said "leave for later")
  * skipping legacy/archive paths (frontend handoff/, problem version docs/, *.html
    snapshots at repo root)
  * skipping build artefacts and lockfiles

Operates on bytes to preserve original line endings (CRLF/LF mixed across Windows
and Docker builds).

Run: python .claude/rename-orvexa.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", "coverage", ".vite", ".turbo",
    ".next", ".cache", ".claude", "test-results", "frontend handoff",
    "problem version docs", "playwright-report",
}

SKIP_FILES = {
    "package-lock.json",
    "TableFlow DMOS - standalone.html",
    "tableflow DMOS 2.html",
    "rename-orvexa.py",
}

TEXT_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".html",
    ".css", ".scss", ".sass", ".yml", ".yaml", ".sh", ".conf", ".sql",
    ".txt", ".toml", ".env", ".example",
}

TEXT_NAMES = {
    "Dockerfile", "Dockerfile.frontend",
    ".gitignore", ".dockerignore", ".prettierignore", ".editorconfig",
    ".nvmrc", ".prettierrc.json", ".env.example",
}

PROTECT = b"__TFTN_DOMAIN_PROTECT__"

REPLACEMENTS: list[tuple[bytes, bytes]] = [
    (b"@tableflow/", b"@orvexa/"),
    (b"TableFlow", b"Orvexa"),
    (b"Tableflow", b"Orvexa"),
    (b"TABLEFLOW", b"ORVEXA"),
    (b"tableflow", b"orvexa"),
]


def is_text_file(path: Path) -> bool:
    if path.name in TEXT_NAMES:
        return True
    if path.name.startswith(".env"):
        return True
    if path.name.startswith("Dockerfile"):
        return True
    return path.suffix.lower() in TEXT_EXTS


def transform(content: bytes) -> bytes:
    out = content.replace(b"tableflow.tn", PROTECT)
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    out = out.replace(PROTECT, b"tableflow.tn")
    return out


def main() -> int:
    changed: list[Path] = []
    skipped_binary = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname in SKIP_FILES:
                continue
            fpath = Path(dirpath) / fname
            if not is_text_file(fpath):
                continue
            try:
                original = fpath.read_bytes()
            except OSError as exc:
                print(f"[rename] skip {fpath}: {exc}", file=sys.stderr)
                continue
            # Cheap binary-content guard: skip if NUL byte present
            if b"\x00" in original:
                skipped_binary += 1
                continue
            new = transform(original)
            if new != original:
                fpath.write_bytes(new)
                changed.append(fpath.relative_to(ROOT))

    print(f"[rename] {len(changed)} files changed, {skipped_binary} binary skipped")
    for p in changed:
        print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
