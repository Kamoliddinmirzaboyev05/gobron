"""Local time for the business, not for the server.

The box runs UTC. Uzbekistan is UTC+5, so `date.today()` rolls over at 05:00
local and `datetime.now()` reports a time five hours behind the players and
owners looking at the app. Everything user-facing (which day is "today", has
this slot started yet) must go through here.

ponytail: one hardcoded zone, because there is one country. If Gobron ever
launches abroad, hang the zone off the venue.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Tashkent")


def now_local() -> datetime:
    """Wall-clock time in Tashkent, naive (matches the naive DB columns)."""
    return datetime.now(TZ).replace(tzinfo=None)


def today_local() -> date:
    return now_local().date()
