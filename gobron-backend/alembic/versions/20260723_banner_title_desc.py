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
    # IF NOT EXISTS: safe if column already added manually on production.
    op.execute("ALTER TABLE banners ADD COLUMN IF NOT EXISTS title VARCHAR(200)")
    op.execute(
        "ALTER TABLE banners ADD COLUMN IF NOT EXISTS description VARCHAR(500)"
    )


def downgrade() -> None:
    op.drop_column("banners", "description")
    op.drop_column("banners", "title")
