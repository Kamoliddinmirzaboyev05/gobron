"""add banners table

Revision ID: 20260709_banners
Revises: e4be67616f36
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260709_banners"
down_revision: str | None = "e4be67616f36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "banners",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("banners")
