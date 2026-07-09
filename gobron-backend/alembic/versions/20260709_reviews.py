"""add reviews table

Revision ID: 20260709_reviews
Revises: 20260709_banners
Create Date: 2026-07-09
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260709_reviews"
down_revision: str | None = "20260709_banners"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("field_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating_range"),
        sa.UniqueConstraint("booking_id"),
    )
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])
    op.create_index("ix_reviews_field_id", "reviews", ["field_id"])


def downgrade() -> None:
    op.drop_index("ix_reviews_field_id", table_name="reviews")
    op.drop_index("ix_reviews_user_id", table_name="reviews")
    op.drop_table("reviews")
