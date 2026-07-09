"""add bookings.reminder_sent_at

Revision ID: 20260709_booking_reminder
Revises: 20260709_payment_settings
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260709_booking_reminder"
down_revision: str | None = "20260709_payment_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "bookings", sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("bookings", "reminder_sent_at")
