#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


INDEX_NAME = "PROJECT_INDEX.json"


def run_git(root: Path, *args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        return (exc.stdout or exc.stderr or "").strip()
    return completed.stdout.strip()


def find_root(start: Path) -> Path:
    current = start.resolve()
    if current.is_file():
        current = current.parent
    for path in (current, *current.parents):
        if (path / INDEX_NAME).is_file():
            return path
    raise SystemExit(f"[error] {INDEX_NAME} not found from {start}")


def load_index(root: Path) -> dict[str, Any]:
    with (root / INDEX_NAME).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def status_porcelain(root: Path) -> list[tuple[str, str]]:
    output = run_git(root, "status", "--porcelain")
    entries: list[tuple[str, str]] = []
    for line in output.splitlines():
        if not line:
            continue
        entries.append((line[:2], line[3:]))
    return entries


def is_under(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def print_summary(root: Path, index: dict[str, Any]) -> None:
    branch = run_git(root, "symbolic-ref", "--short", "HEAD") or "detached"
    sha = run_git(root, "rev-parse", "--short", "HEAD") or "unknown"
    remote = run_git(root, "remote", "get-url", "origin") or "missing"
    print(f"project_id: {index.get('project_id')}")
    print(f"root: {root}")
    print(f"branch: {branch}")
    print(f"commit: {sha}")
    print(f"origin: {remote}")
    print(f"workbench: {index.get('daily_urls', {}).get('workbench')}")


def check(root: Path, index: dict[str, Any], cwd: Path) -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not is_under(cwd, root):
        errors.append(f"cwd is outside indexed root: {cwd}")

    expected_remote = index.get("github_url")
    actual_remote = run_git(root, "remote", "get-url", "origin")
    if expected_remote and actual_remote != expected_remote:
        errors.append(f"origin mismatch: expected {expected_remote}, got {actual_remote or 'missing'}")

    for label, rel_path in index.get("source_anchors", {}).items():
        if not (root / rel_path).exists():
            errors.append(f"missing source anchor {label}: {rel_path}")

    for feature, rel_paths in index.get("feature_anchors", {}).items():
        for rel_path in rel_paths:
            if not (root / rel_path).exists():
                errors.append(f"missing feature anchor {feature}: {rel_path}")

    staged_or_dirty = status_porcelain(root)
    never_stage = tuple(index.get("commit_guard", {}).get("never_stage", []))
    warn_untracked = set(index.get("commit_guard", {}).get("warn_if_untracked", []))
    for flags, rel_path in staged_or_dirty:
        if flags[0] != " " and rel_path.startswith(never_stage):
            errors.append(f"forbidden staged path: {rel_path}")
        if flags == "??" and rel_path in warn_untracked:
            warnings.append(f"version/context file is untracked: {rel_path}")

    print_summary(root, index)
    print()
    if warnings:
        print("[warnings]")
        for item in warnings:
            print(f"- {item}")
        print()
    if errors:
        print("[errors]")
        for item in errors:
            print(f"- {item}")
        return 1

    print("[ok] project index check passed")
    return 0


def list_files(root: Path, index: dict[str, Any]) -> None:
    for rel_path in index.get("feature_anchors", {}).get("xhs_copy_extract", []):
        print(root / rel_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Locate and validate this project from any subdirectory.")
    parser.add_argument("command", choices=["show", "check", "files"], nargs="?", default="show")
    parser.add_argument("--from", dest="start", default=".", help="Directory used to locate PROJECT_INDEX.json")
    args = parser.parse_args(argv)

    start = Path(args.start)
    root = find_root(start)
    index = load_index(root)

    if args.command == "show":
        print_summary(root, index)
        return 0
    if args.command == "check":
        return check(root, index, Path.cwd())
    if args.command == "files":
        list_files(root, index)
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
