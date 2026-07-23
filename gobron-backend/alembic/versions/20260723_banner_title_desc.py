"""banner title and description

Revision ID: 20260723_banner_title_desc
Revises: 20260723_payment_intents
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260723_banner_title_desc"
down_revision: Union[str, None] = "20260723_payment_intents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "banners",
        sa.Column("title", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "banners",
        sa.Column("description", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("banners", "description")
    op.drop_column("banners", "title")
