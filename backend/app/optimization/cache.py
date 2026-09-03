"""In-memory cache for expensive optimization runs."""

from __future__ import annotations

import json
import time
from typing import Callable

from app.schemas.optimization import OptimizeResponse

_CACHE: dict[str, tuple[float, OptimizeResponse]] = {}
TTL_SECONDS = 300


def _cache_key(well_id: str, weights: dict | None) -> str:
    return f"{well_id}:{json.dumps(weights or {}, sort_keys=True)}"


def cached_optimize(
    well_id: str,
    weights: dict | None,
    compute: Callable[[], OptimizeResponse],
) -> OptimizeResponse:
    key = _cache_key(well_id, weights)
    now = time.time()

    if key in _CACHE:
        ts, result = _CACHE[key]
        if now - ts < TTL_SECONDS:
            return result

    result = compute()
    _CACHE[key] = (now, result)
    return result


def invalidate_cache(well_id: str | None = None) -> None:
    if well_id is None:
        _CACHE.clear()
        return
    keys = [k for k in _CACHE if k.startswith(f"{well_id}:")]
    for k in keys:
        del _CACHE[k]
