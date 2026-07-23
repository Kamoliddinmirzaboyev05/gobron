"""telegram matcher settings on payment_settings (2FA, session, API)

Revision ID: 20260724_matcher_telegram
Revises: 20260723_banner_title_desc
Create Date: 2026-07-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260724_matcher_telegram"
down_revision: Union[str, None] = "20260723_banner_title_desc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payment_settings",
        sa.Column("telegram_api_id", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "payment_settings",
        sa.Column("telegram_api_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "payment_settings",
        sa.Column("telegram_phone", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "payment_settings",
        sa.Column("telegram_2fa_password", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "payment_settings",
        sa.Column("telegram_session", sa.Text(), nullable=True),
    )
    op.add_column(
        "payment_settings",
        sa.Column(
            "humo_bot_username",
            sa.String(length=64),
            nullable=True,
            server_default="HUMOcardbot",
        ),
    )


def downgrade() -> None:
    op.drop_column("payment_settings", "humo_bot_username")
    op.drop_column("payment_settings", "telegram_session")
    op.drop_column("payment_settings", "telegram_2fa_password")
    op.drop_column("payment_settings", "telegram_phone")
    op.drop_column("payment_settings", "telegram_api_hash")
    op.drop_column("payment_settings", "telegram_api_id")
