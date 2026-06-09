from __future__ import annotations

import sys
from pathlib import Path
ENGINE_PATH = str(Path(__file__).resolve().parent.parent / "downloader_engine")
if ENGINE_PATH not in sys.path:
    sys.path.insert(0, ENGINE_PATH)

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from backend.app.api import (
    accounts, ai, auth, auto_tasks, browser_login, drafts, files, 
    keyword_groups, login_sessions, model_configs, notes, 
    notifications, publish, tags, tasks, downloader, ops, system, local_helper
)
from backend.app.api.platforms import registry
from backend.app.api.platforms.xhs import analytics, crawl, creator, monitoring, pc
from backend.app.core.config import get_settings
from backend.app.core.database import init_db
from backend.app.services.scheduler_service import run_due_auto_tasks, shutdown_due_publish_scheduler, start_due_publish_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    settings = get_settings()
    # Create default user for "one-click" startup
    from sqlalchemy import select
    from backend.app.core.database import SessionLocal
    from backend.app.models import User
    from backend.app.core.security import hash_password
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == "admin"))
        if not user:
            admin_password = settings.bootstrap_admin_password
            if not admin_password:
                if settings.is_production:
                    raise RuntimeError("生产环境禁止创建默认 admin/password123，请设置 BOOTSTRAP_ADMIN_PASSWORD。")
                admin_password = "password123"
            user = User(username="admin", password_hash=hash_password(admin_password))
            db.add(user)
            db.commit()
        
        # Purge expired crawl cache
        from backend.app.services.crawl_cache_service import purge_expired_cache
        purged = purge_expired_cache(db)
        if purged > 0:
            from loguru import logger
            logger.info(f"Purged {purged} expired crawl cache entries")
    
    scheduler = None
    if settings.scheduler_enabled:
        scheduler = start_due_publish_scheduler(settings.scheduler_interval_seconds)
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        shutdown_due_publish_scheduler(scheduler)


def create_app() -> FastAPI:
    settings = get_settings()
    docs_enabled = settings.expose_api_docs or not settings.is_production
    hidden_docs_paths = {"/docs", "/redoc", "/openapi.json"}
    app = FastAPI(
        title=settings.api_title,
        lifespan=lifespan,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    if not docs_enabled:
        @app.get("/docs", include_in_schema=False)
        @app.get("/redoc", include_in_schema=False)
        @app.get("/openapi.json", include_in_schema=False)
        def _hidden_api_docs() -> None:
            raise HTTPException(status_code=404, detail="Not found")

    allowed_hosts = [host.strip() for host in settings.allowed_hosts.split(",") if host.strip()]
    if allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    @app.middleware("http")
    async def _security_headers(request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

    origins = [origin.strip() for origin in settings.backend_cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok", "service": "spider-xhs"}

    app.include_router(registry.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(accounts.router, prefix="/api")
    app.include_router(login_sessions.router, prefix="/api")
    app.include_router(browser_login.router, prefix="/api")
    app.include_router(notes.router, prefix="/api")
    app.include_router(files.router, prefix="/api")
    app.include_router(drafts.router, prefix="/api")
    app.include_router(ai.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")
    app.include_router(model_configs.router, prefix="/api")
    app.include_router(tags.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(keyword_groups.router, prefix="/api")
    app.include_router(publish.router, prefix="/api")
    app.include_router(analytics.router, prefix="/api")
    app.include_router(pc.router, prefix="/api")
    app.include_router(creator.router, prefix="/api")
    app.include_router(crawl.router, prefix="/api")
    app.include_router(monitoring.router, prefix="/api")
    app.include_router(auto_tasks.router, prefix="/api")
    app.include_router(downloader.router, prefix="/api")
    app.include_router(system.router, prefix="/api")
    app.include_router(ops.router, prefix="/api")
    app.include_router(local_helper.router, prefix="/api")

    # Serve pre-built frontend in production / Docker
    if settings.frontend_serve_static:
        frontend_dist = Path(settings.frontend_build_dir)
        if frontend_dist.is_dir():
            from starlette.responses import FileResponse

            # Serve index.html for SPA client-side routing (non-API, non-file paths)
            @app.middleware("http")
            async def _spa_fallback(request, call_next):
                response = await call_next(request)
                path = request.url.path
                if (
                    response.status_code == 404
                    and not path.startswith("/api")
                    and path not in hidden_docs_paths
                    and "." not in path.split("/")[-1]
                ):
                    return FileResponse(str(frontend_dist / "index.html"))
                return response

            app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

    return app


app = create_app()
