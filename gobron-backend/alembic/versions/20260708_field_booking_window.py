"""add field booking_window_days

Revision ID: 20260708_field_booking_window
Revises: 20260707_broadcast_audience
Create Date: 2026-07-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260708_field_booking_window"
down_revision: str | None = "20260707_broadcast_audience"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "fields",
        sa.Column("booking_window_days", sa.Integer(), nullable=False, server_default="3"),
    )


def downgrade() -> None:
    op.drop_column("fields", "booking_window_days")
