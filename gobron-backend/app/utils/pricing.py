"""Pricing helpers — compute the effective price of a slot.

Price = base price_per_slot, multiplied by the field's peak multiplier when the
slot starts at or after the field's peak_start_time (e.g. evening hours cost
more). Kept pure and dependency-free so it is trivial to unit-test.
"""
from datetime import time
from decimal import Decimal, ROUND_HALF_UP


def compute_slot_price(
    *,
    base_price: Decimal,
    start_time: time,
    peak_start_time: time | None,
    peak_multiplier: Decimal,
) -> Decimal:
    """Return the price for a slot starting at ``start_time``."""
    price = Decimal(base_price)
    if peak_start_time is not None and start_time >= peak_start_time:
        price = price * Decimal(peak_multiplier)
    # Round to 2 decimals (currency).
    return price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
