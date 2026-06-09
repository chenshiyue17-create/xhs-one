# Secret Scan Report

Date: 2026-06-09
Repository: `chenshiyue17-create/xhs-one`
Visibility: public
Default branch: `main`

## Summary

The current working tree, `origin/main`, and the cleaned `origin/codex/consolidate-xhs-one` branch do not contain detected secret patterns from the scan set. A sensitive-looking API key pattern was previously present in the old `origin/codex/consolidate-xhs-one` history and current branch content at `activate_ai.py:16`.

Treat the exposed key as compromised because it was previously published in a public repository branch. Rotate it at the provider even though the branch has now been rewritten.

## Findings

### Critical: API Key Pattern In Git History

- Location: `activate_ai.py:16`
- Affected commits:
  - `6bbc0790f5bcb0cd18eb355b13e1a3afa6879a5c`
  - `b770b9a8beb231d8324b52c08b557c0403fb4e3b`
  - `d91d53aba230e483d2b982630137427d86fa3833`
- Affected refs:
  - `codex/consolidate-xhs-one`
  - `origin/codex/consolidate-xhs-one`
  - local `master` contains one older affected commit
- Status: fixed in the local working tree; `origin/codex/consolidate-xhs-one` was force-updated to a clean commit on top of `origin/main`.
- Impact: anyone with access to the public GitHub branch/history may recover the key.

### Local Ignored Sensitive Files

These files exist locally and are ignored by Git, so ordinary commits should not upload them:

- `.env`
- `output/system_ops_token.txt`

Status: not tracked in Git.

## Clean Areas

- Current tracked working tree scan: clean.
- Current full working tree pattern scan, excluding dependency/build folders: clean.
- `origin/main` current content scan: clean.
- `origin/codex/consolidate-xhs-one` current content scan: clean after rewrite.
- Local `git rev-list --all` history scan: clean after deleting stale local `master`, fixing `origin/HEAD`, expiring reflogs, and pruning unreachable objects.
- Tracked sensitive filename scan: clean.
- Historical sensitive filename scan: clean on remaining refs.
- GitHub Secret Scanning API: no alerts returned during this check.

## Commands Used

```bash
scripts/security-scan.sh
git log --all --name-only --pretty=format:
git grep -I -n -E '<redacted secret patterns>' $(git rev-list --all)
git grep -I -n -E '<redacted secret patterns>' origin/main
git grep -I -n -E '<redacted secret patterns>' origin/codex/consolidate-xhs-one
gh repo view chenshiyue17-create/xhs-one --json nameWithOwner,visibility,defaultBranchRef,pushedAt,url
gh api repos/chenshiyue17-create/xhs-one/secret-scanning/alerts --paginate
```

## Required Remediation

1. Rotate the exposed API key immediately at the provider.
2. Keep `.env` and `output/system_ops_token.txt` local only; do not copy them to docs, screenshots, commits, or deployment bundles.
3. Keep `scripts/security-scan.sh` and `.githooks/pre-commit` enabled before any future push.
