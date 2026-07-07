from app.models.broadcast import Broadcast
from app.models.enums import BroadcastAudience
from app.schemas.broadcast import BroadcastCreate
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
