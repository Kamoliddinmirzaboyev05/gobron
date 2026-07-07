"""add broadcast audience

Revision ID: 20260707_broadcast_audience
Revises: 20260707_field_owner_redesign
Create Date: 2026-07-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260707_broadcast_audience"
down_revision: str | None = "20260707_field_owner_redesign"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    audience = postgresql.ENUM(
        "bot_users",
        "field_owners",
        "all",
        name="broadcast_audience",
        create_type=False,
    )
    audience.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "broadcasts",
        sa.Column(
            "audience",
            audience,
            nullable=False,
            server_default="bot_users",
        ),
    )


def downgrade() -> None:
    op.drop_column("broadcasts", "audience")
    sa.Enum(name="broadcast_audience").drop(op.get_bind(), checkfirst=True)
