import json
from typing import Any, Optional
import redis.asyncio as aioredis
from app.config import settings

_redis: Optional[aioredis.Redis] = None


async def init_redis() -> None:
    global _redis
    _redis = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )


async def close_redis() -> None:
    if _redis:
        await _redis.aclose()


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialised  call init_redis() first")
    return _redis


# -- Convenience helpers ------------------------------------------------------

async def redis_set(key: str, value: Any, ttl: Optional[int] = None) -> None:
    r = get_redis()
    serialised = json.dumps(value)
    if ttl:
        await r.setex(key, ttl, serialised)
    else:
        await r.set(key, serialised)


async def redis_get(key: str) -> Optional[Any]:
    r = get_redis()
    raw = await r.get(key)
    return json.loads(raw) if raw is not None else None


async def redis_delete(key: str) -> None:
    await get_redis().delete(key)


# Key builders
def signal_key(intersection_id: int) -> str:
    return f"signal:{intersection_id}"


def traffic_key(intersection_id: int) -> str:
    return f"traffic:{intersection_id}"


def corridor_key(corridor_id: str) -> str:
    return f"corridor:{corridor_id}"


def conflict_queue_key() -> str:
    return "conflict:queue"
