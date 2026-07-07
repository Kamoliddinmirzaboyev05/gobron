"""Import every model so Alembic's autogenerate and SQLAlchemy's mappers can
discover them from a single place.
"""
from app.core.database import Base
from app.models.booking import Booking
from app.models.broadcast import Broadcast
from app.models.field import Field
from app.models.field_owner import FieldOwner
from app.models.manual_booking import ManualBooking
from app.models.payment import Payment
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue

__all__ = [
    "Base",
    "User",
    "FieldOwner",
    "Venue",
    "Field",
    "ManualBooking",
    "Slot",
    "Booking",
    "Payment",
    "Broadcast",
]
