"""Import every model so Alembic's autogenerate and SQLAlchemy's mappers can
discover them from a single place.
"""
from app.core.database import Base
from app.models.banner import Banner
from app.models.booking import Booking
from app.models.broadcast import Broadcast
from app.models.field import Field
from app.models.field_owner import FieldOwner
from app.models.manual_booking import ManualBooking
from app.models.payment import Payment
from app.models.push_subscription import PushSubscription
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue
from app.models.subscription_payment import SubscriptionPayment

__all__ = [
    "Base",
    "Banner",
    "User",
    "FieldOwner",
    "Venue",
    "Field",
    "ManualBooking",
    "Slot",
    "Booking",
    "Payment",
    "Broadcast",
    "PushSubscription",
    "SubscriptionPayment",
]
