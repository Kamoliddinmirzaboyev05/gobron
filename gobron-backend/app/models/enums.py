"""Shared enums used across models and schemas."""
import enum


class UserRole(str, enum.Enum):
    PLAYER = "player"          # books fields via user-web
    FIELD_OWNER = "field_owner"  # manages own fields via flutter-admin
    SUPERADMIN = "superadmin"    # full access via superadmin panel


class SlotStatus(str, enum.Enum):
    AVAILABLE = "available"   # free to book
    BOOKED = "booked"         # reserved by a confirmed booking
    BLOCKED = "blocked"       # manually blocked by the owner (maintenance, etc.)


class BookingStatus(str, enum.Enum):
    PENDING = "pending"        # created, awaiting payment
    CONFIRMED = "confirmed"    # paid / accepted
    CANCELLED = "cancelled"
    COMPLETED = "completed"    # slot time has passed


class ManualBookingStatus(str, enum.Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class RecurrenceType(str, enum.Enum):
    ONCE = "once"        # "Bir marta"
    DAILY = "daily"      # "Har kuni"
    WEEKLY = "weekly"    # "Har hafta" (same weekday)


class PaymentProvider(str, enum.Enum):
    CLICK = "click"
    PAYME = "payme"
    CASH = "cash"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class BroadcastStatus(str, enum.Enum):
    DRAFT = "draft"        # created, not sent yet
    SENDING = "sending"    # delivery in progress
    SENT = "sent"          # finished
    FAILED = "failed"


class BroadcastAudience(str, enum.Enum):
    BOT_USERS = "bot_users"
    FIELD_OWNERS = "field_owners"
    ALL = "all"
