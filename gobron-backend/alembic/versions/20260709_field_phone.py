"""add fields.phone

Revision ID: 20260709_field_phone
Revises: 20260709_booking_reminder
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260709_field_phone"
down_revision: str | None = "20260709_booking_reminder"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("fields", sa.Column("phone", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("fields", "phone")
