"""payment intents + unmatched transactions for Humo P2P matcher

Revision ID: 20260723_payment_intents
Revises: e4be67616f36
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260723_payment_intents"
down_revision: Union[str, None] = "20260709_field_amenities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payment_settings",
        sa.Column(
            "subscription_amount",
            sa.Numeric(12, 2),
            server_default="50000",
            nullable=False,
        ),
    )

    op.create_table(
        "payment_intents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("base_amount", sa.Integer(), nullable=False),
        sa.Column("unique_amount", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("matched_message", sa.Text(), nullable=True),
        sa.Column("message_hash", sa.String(64), nullable=True, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    # Only one active pending intent may hold a given unique_amount at a time.
    # Enforced in app code + partial uniqueness via index where status=pending.
    op.create_index(
        "ix_payment_intents_pending_amount",
        "payment_intents",
        ["unique_amount"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "ix_payment_intents_status_expires",
        "payment_intents",
        ["status", "expires_at"],
    )

    op.create_table(
        "unmatched_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("raw_message", sa.Text(), nullable=False),
        sa.Column("message_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("reason", sa.String(40), nullable=False, server_default="no_match"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("unmatched_transactions")
    op.drop_index("ix_payment_intents_status_expires", table_name="payment_intents")
    op.drop_index("ix_payment_intents_pending_amount", table_name="payment_intents")
    op.drop_table("payment_intents")
    op.drop_column("payment_settings", "subscription_amount")
