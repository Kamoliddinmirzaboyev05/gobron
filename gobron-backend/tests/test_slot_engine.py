"""Self-checks for the pure slot-tiling and pricing logic (no DB needed).

Run:  python -m tests.test_slot_engine   (or: pytest tests/)
"""
from datetime import time
from decimal import Decimal

from app.services.slot_service import _iter_start_times
from app.utils.pricing import compute_slot_price


def test_tiling_60min():
    windows = _iter_start_times(time(8, 0), time(11, 0), 60)
    assert windows == [
        (time(8, 0), time(9, 0)),
        (time(9, 0), time(10, 0)),
        (time(10, 0), time(11, 0)),
    ]


def test_tiling_30min_drops_partial_tail():
    # 08:00..09:20 with 30-min slots -> 08:00, 08:30; the 09:00 slot would end
    # at 09:30 (past close) so it is discarded.
    windows = _iter_start_times(time(8, 0), time(9, 20), 30)
    assert windows == [(time(8, 0), time(8, 30)), (time(8, 30), time(9, 0))]


def test_pricing_offpeak_unchanged():
    price = compute_slot_price(
        base_price=Decimal("100000"),
        start_time=time(10, 0),
        peak_start_time=time(18, 0),
        peak_multiplier=Decimal("1.5"),
    )
    assert price == Decimal("100000.00")


def test_pricing_peak_multiplied():
    price = compute_slot_price(
        base_price=Decimal("100000"),
        start_time=time(19, 0),
        peak_start_time=time(18, 0),
        peak_multiplier=Decimal("1.5"),
    )
    assert price == Decimal("150000.00")


if __name__ == "__main__":
    test_tiling_60min()
    test_tiling_30min_drops_partial_tail()
    test_pricing_offpeak_unchanged()
    test_pricing_peak_multiplied()
    print("all slot-engine checks passed ✅")
