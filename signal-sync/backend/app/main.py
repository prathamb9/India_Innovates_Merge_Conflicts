from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.config import settings
from app.database import engine, Base
import app.models  # ensure all models imported
from app.redis_client import init_redis, close_redis
from app.middleware.auth import init_firebase
from app.services.routing_engine import build_graph
from app.database import AsyncSessionLocal

# API routers
from app.api import auth, corridor, signal, route, vision, traffic, incident, chat, health as health_router
from app.websocket.router import router as ws_router

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    log.info(" SignalSync backend starting up...")

    # 1. Firebase Admin
    init_firebase()

    # 2. Redis
    await init_redis()

    # 3. Create DB tables (dev only  use Alembic migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 4. Build routing graph from DB
    try:
        async with AsyncSessionLocal() as db:
            await build_graph(db)
    except Exception as e:
        log.warning("Routing graph build failed  running without pre-loaded graph", error=str(e))

    log.info(" SignalSync backend ready")
    yield

    # Shutdown
    await close_redis()
    await engine.dispose()
    log.info("SignalSync backend shut down cleanly")


app = FastAPI(
    title="SignalSync Backend API",
    description=(
        "Dynamic traffic signal control, green corridor management, "
        "emergency vehicle prioritization, and real-time ML integration."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# -- CORS ---------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- REST routers -------------------------------------------------------------
app.include_router(health_router.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(corridor.router, prefix="/api/v1")
app.include_router(signal.router, prefix="/api/v1")
app.include_router(route.router, prefix="/api/v1")
app.include_router(vision.router, prefix="/api/v1")
app.include_router(traffic.router, prefix="/api/v1")
app.include_router(incident.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")

# -- WebSocket -----------------------------------------------------------------
app.include_router(ws_router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Fail-safe: any unhandled exception returns 500.
    Signal nodes that poll /health will detect degraded state and fall back
    to NORMAL mode autonomously.
    """
    log.error("Unhandled exception", path=request.url.path, error=str(exc))
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
