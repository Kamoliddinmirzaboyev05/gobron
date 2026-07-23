"""Process-local sliding-window rate limiter.

Fine for a single-worker / small deployment. Swap for Redis when scaling.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self) -> None:
        # key -> timestamps of hits within the window
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, limit: int, window_seconds: float) -> bool:
        """Return True if under the limit; records the hit when allowed."""
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    def remaining(self, key: str, *, limit: int, window_seconds: float) -> int:
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        return max(0, limit - len(bucket))


# Shared singleton used by auth endpoints.
auth_limiter = RateLimiter()
