"""Unique payment amount = base + tip (1..99).

Two concurrent pending intents must never share the same unique_amount.
"""
from __future__ import annotations

import random


def generate_unique_amount(base_amount: int, taken: set[int]) -> int:
    """Return base_amount + tip in [1, 99] not present in ``taken``.

    Raises ValueError if every tip is already taken (extremely rare).
    """
    if base_amount < 1:
        raise ValueError("base_amount must be positive")

    candidates = list(range(1, 100))
    random.shuffle(candidates)
    for tip in candidates:
        amount = base_amount + tip
        if amount not in taken:
            return amount
    raise ValueError("No free unique amount available; try again shortly")
