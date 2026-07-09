from datetime import date, datetime, time, timedelta
from types import SimpleNamespace

import pytest

from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience
from app.schemas.broadcast import BroadcastCreate
from app.services import booking_notifications as notif
from app.services.broadcast_service import BroadcastService


def test_broadcast_create_defaults_to_bot_users():
    body = BroadcastCreate(text="Salom")

    assert body.audience == BroadcastAudience.BOT_USERS


def test_broadcast_audience_binds_lowercase_values():
    from sqlalchemy.dialects import postgresql

    status_type = Broadcast.__table__.c.audience.type
    bind_processor = status_type.bind_processor(dialect := postgresql.dialect())

    assert bind_processor is not None
    assert bind_processor(BroadcastAudience.FIELD_OWNERS) == "field_owners"
    assert status_type.result_processor(dialect, None)("all") == BroadcastAudience.ALL


def test_field_owner_broadcast_skips_telegram_delivery():
    broadcast = Broadcast(text="Owner post", audience=BroadcastAudience.FIELD_OWNERS)

    assert BroadcastService._includes_bot_users(broadcast) is False


def test_all_broadcast_includes_telegram_delivery():
    broadcast = Broadcast(text="Everyone", audience=BroadcastAudience.ALL)

    assert BroadcastService._includes_bot_users(broadcast) is True


def test_owner_router_exposes_notifications_route():
    from app.main import app

    paths = {route.path for route in app.routes}

    assert "/api/v1/owner/notifications" in paths


def test_bot_onboarding_states_are_name_region_phone_only():
    from bot.main import Onboarding

    states = [state.state.split(":")[-1] for state in Onboarding.__states__]

    assert states == ["first_name", "region", "phone"]


# --- booking notifications ---------------------------------------------------

NOW = datetime(2026, 7, 9, 18, 0)


def _booking(start=time(19, 0), end=time(20, 0), day=NOW.date(), telegram_id=555):
    return SimpleNamespace(
        total_price=120000,
        reminder_sent_at=None,
        user=SimpleNamespace(telegram_id=telegram_id),
        slot=SimpleNamespace(
            slot_date=day, start_time=start, end_time=end, field=SimpleNamespace(name="2-maydon")
        ),
    )


class FakeDB:
    def __init__(self):
        self.commits = 0

    async def commit(self):
        self.commits += 1


def test_reminder_is_due_only_inside_the_lead_and_before_kickoff():
    assert notif.is_due(NOW + timedelta(minutes=60), NOW) is True
    assert notif.is_due(NOW + timedelta(minutes=1), NOW) is True
    assert notif.is_due(NOW + timedelta(minutes=61), NOW) is False
    # Kickoff already happened, or is happening right now: too late to warn.
    assert notif.is_due(NOW, NOW) is False
    assert notif.is_due(NOW - timedelta(minutes=1), NOW) is False


def test_countdown_never_promises_an_hour_it_does_not_have():
    assert notif.countdown_label(60) == "1 soat qoldi"
    assert notif.countdown_label(50) == "1 soat qoldi"
    assert notif.countdown_label(35) == "35 daqiqa qoldi"


def test_day_label_reads_naturally_for_today_and_tomorrow():
    today = date(2026, 7, 9)
    assert notif.day_label(today, today) == "bugungi"
    assert notif.day_label(date(2026, 7, 10), today) == "ertangi"
    assert notif.day_label(date(2026, 7, 20), today) == "20.07.2026 kungi"


def test_confirmation_text_carries_the_slot_field_and_price():
    text = notif.confirmation_text(_booking(), NOW.date())

    assert "bugungi 19:00 - 20:00 dagi broningiz tasdiqlandi" in text
    assert "2-maydon" in text
    assert "120 000 so'm" in text


def test_reminder_text_carries_the_field_and_price():
    text = notif.reminder_text(_booking(), minutes=60)

    assert "1 soat qoldi" in text
    assert "2-maydon" in text
    assert "19:00 - 20:00" in text
    assert "120 000 so'm" in text


@pytest.mark.asyncio
async def test_delivered_reminder_is_stamped_so_the_next_tick_skips_it(monkeypatch):
    booking, db = _booking(), FakeDB()
    monkeypatch.setattr(notif, "due_reminders", _returns([booking]))
    monkeypatch.setattr(notif.telegram, "send_message", _sender(ok=True))

    assert await notif.send_due_reminders(db, NOW) == 1
    assert booking.reminder_sent_at is not None
    assert db.commits == 1


@pytest.mark.asyncio
async def test_failed_reminder_stays_unstamped_so_the_next_tick_retries(monkeypatch):
    booking, db = _booking(), FakeDB()
    monkeypatch.setattr(notif, "due_reminders", _returns([booking]))
    monkeypatch.setattr(notif.telegram, "send_message", _sender(ok=False))

    assert await notif.send_due_reminders(db, NOW) == 0
    assert booking.reminder_sent_at is None


@pytest.mark.asyncio
async def test_player_without_telegram_is_stamped_not_retried_forever(monkeypatch):
    booking, db = _booking(telegram_id=None), FakeDB()
    monkeypatch.setattr(notif, "due_reminders", _returns([booking]))
    monkeypatch.setattr(notif.telegram, "send_message", _explodes)

    assert await notif.send_due_reminders(db, NOW) == 0
    assert booking.reminder_sent_at is not None


@pytest.mark.asyncio
async def test_reminder_reports_the_real_gap_when_the_loop_woke_up_late(monkeypatch):
    # Loop was down; only 20 minutes are left by the time the tick runs.
    booking, db, seen = _booking(), FakeDB(), []
    monkeypatch.setattr(notif, "due_reminders", _returns([booking]))

    async def capture(chat_id, text, *a, **kw):
        seen.append(text)
        return True

    monkeypatch.setattr(notif.telegram, "send_message", capture)
    await notif.send_due_reminders(db, NOW + timedelta(minutes=40))

    assert "20 daqiqa qoldi" in seen[0]
    assert "1 soat" not in seen[0]


@pytest.mark.asyncio
async def test_reminder_loop_survives_a_failing_tick(monkeypatch):
    import asyncio

    from bot import reminders

    ticks = []

    async def flaky(db, now=None):
        ticks.append(len(ticks))
        if len(ticks) == 1:
            raise RuntimeError("database went away")
        raise asyncio.CancelledError  # second tick proves the loop came back

    monkeypatch.setattr(reminders, "send_due_reminders", flaky)
    with pytest.raises(asyncio.CancelledError):
        await reminders.reminder_loop(interval=0)

    assert len(ticks) == 2


def _returns(bookings):
    async def _due(db, now):
        return bookings

    return _due


def _sender(ok: bool):
    async def _send(chat_id, text, *a, **kw):
        return ok

    return _send


async def _explodes(*a, **kw):
    raise AssertionError("must not message a player with no telegram_id")
