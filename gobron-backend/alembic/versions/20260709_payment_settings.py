"""add payment_settings table

Revision ID: 20260709_payment_settings
Revises: 20260709_reviews
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260709_payment_settings"
down_revision: str | None = "20260709_reviews"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "payment_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("card_number", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("card_holder", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("bank_name", sa.String(length=100), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("payment_settings")
