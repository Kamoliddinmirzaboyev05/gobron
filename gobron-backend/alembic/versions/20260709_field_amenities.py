"""add fields.amenities

Revision ID: 20260709_field_amenities
Revises: 20260709_field_phone
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260709_field_amenities"
down_revision: str | None = "20260709_field_phone"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "fields",
        sa.Column(
            "amenities",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("fields", "amenities")
