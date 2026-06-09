from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_project_index_points_to_existing_anchors() -> None:
    index = json.loads((ROOT / "PROJECT_INDEX.json").read_text(encoding="utf-8"))

    for rel_path in index["source_anchors"].values():
        assert (ROOT / rel_path).exists(), rel_path

    for rel_paths in index["feature_anchors"].values():
        for rel_path in rel_paths:
            assert (ROOT / rel_path).exists(), rel_path


def test_project_index_script_finds_root_from_subdirectory() -> None:
    completed = subprocess.run(
        [str(ROOT / "scripts/project-index.py"), "show", "--from", str(ROOT / "frontend/src")],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    assert "project_id: xhs-one" in completed.stdout
    assert f"root: {ROOT}" in completed.stdout
