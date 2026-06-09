# Security Hardening

## Current Risk Assessment

| Risk | Severity | Status | Control |
| --- | --- | --- | --- |
| Hard-coded API keys in tracked code | Critical | Fixed in working tree | `activate_ai.py` now reads `DEEPSEEK_API_KEY` from environment only. Rotate any key that was ever committed or pasted into code. |
| `.env`, token files, private keys accidentally committed | Critical | Guarded | `.gitignore`, `.githooks/pre-commit`, and `scripts/security-scan.sh` block common secret patterns. |
| Backend port exposed directly | High | Guarded by config | Production config binds backend to `127.0.0.1:8000`; public traffic should enter only through Nginx ports 80/443. |
| Public `/docs`, `/redoc`, `/openapi.json` | Medium | Guarded | Production config disables API docs and Nginx template returns 404. |
| Default `admin/password123` in production | High | Fixed | Production refuses first-run default admin unless `BOOTSTRAP_ADMIN_PASSWORD` is provided. |
| Host header abuse | Medium | Guarded | FastAPI TrustedHostMiddleware uses `ALLOWED_HOSTS`; production config allows only `tengda.wang`, `www.tengda.wang`, and loopback. |
| Missing browser security headers | Medium | Guarded | FastAPI and Nginx template emit nosniff, frame deny, referrer policy, and permissions policy. |
| HTTPS absent | Medium | Pending | Configure a certificate after DNS points to `47.87.68.74`. Do not enable HSTS until HTTPS is verified stable. |
| Cloud security group allows private ports | High | Pending cloud-console fix | Host processes are hardened, but Alibaba Cloud inbound rules must allow only 80/443 plus the remote management path. Remove public inbound access for 8000, 8765, 8787, and 5173. |

## Required Production Environment

Keep real values on the server only. Do not commit them.

```bash
ENVIRONMENT=production
CONFIG_FILE=config/production.yaml
SERVER_HOST=127.0.0.1
SERVER_PORT=8000
ALLOWED_HOSTS=www.tengda.wang,tengda.wang,127.0.0.1,localhost
EXPOSE_API_DOCS=false
SECRET_KEY=<generate-on-server>
FERNET_KEY=<optional-generate-on-server>
SYSTEM_OPS_TOKEN=<generate-on-server>
BOOTSTRAP_ADMIN_PASSWORD=<first-run-only-if-needed>
```

## Safe Commit Flow

```bash
scripts/install-git-hooks.sh
scripts/security-scan.sh
git status --short
```

If `security-scan.sh` fails, remove the secret from tracked files before committing. If a real key was committed previously, rotate it at the provider and rewrite/remove Git history before making the repository public.

## Server Exposure Checklist

Run on the server:

```bash
sudo ss -ltnp
sudo nginx -t
curl -fsS -H 'Host: www.tengda.wang' http://127.0.0.1/
curl -fsS -H 'Host: www.tengda.wang' http://127.0.0.1/api/health
curl -I -H 'Host: www.tengda.wang' http://127.0.0.1/docs
```

Expected:

- Nginx listens on `0.0.0.0:80` and later `0.0.0.0:443`.
- Backend listens only on `127.0.0.1:8000`.
- Local helper listens only on `127.0.0.1` or is disabled on the server.
- `/docs`, `/redoc`, and `/openapi.json` are not publicly available.
- No database, browser helper, Playwright, Vite dev server, or admin panel ports are open to the internet.

Run from a machine outside the server:

```bash
deploy/server/verify-exposure.sh 47.87.68.74
```

Expected:

- `80/tcp` and `443/tcp` may be reachable.
- `8000/tcp`, `8765/tcp`, `8787/tcp`, and `5173/tcp` must not be publicly reachable.
- If private ports are still reachable after the server has no public listeners, close them in Alibaba Cloud Security Group or Cloud Firewall inbound rules.

## Applied Server Hardening

On the current Alibaba Cloud host:

- `one-xhs` backend now uses `--host 127.0.0.1` so Nginx is the only public entry point.
- `xhs-local-stats.service` was disabled because it exposed `8787/tcp` on `0.0.0.0`.
- Nginx now returns 404 for `/docs`, `/redoc`, and `/openapi.json`.
- DNS still needs `tengda.wang` and `www.tengda.wang` A records pointing to `47.87.68.74` before HTTPS can be finalized.

## Nginx Source of Truth

Use `deploy/nginx/tengda-root.conf` as the canonical HTTP config for `tengda.wang` and `www.tengda.wang`.

After copying it to `/etc/nginx/conf.d/00-tengda-root.conf`, reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```
