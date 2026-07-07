"""field owner venue and manual bookings

Revision ID: 20260707_field_owner_redesign
Revises: 28ffba52f159
Create Date: 2026-07-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260707_field_owner_redesign"
down_revision: str | None = "28ffba52f159"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "venues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("landmark", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("opening_time", sa.Time(), nullable=False),
        sa.Column("closing_time", sa.Time(), nullable=False),
        sa.Column("working_days", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("owner_id"),
    )
    op.create_index("ix_venues_owner_id", "venues", ["owner_id"])

    op.add_column("fields", sa.Column("venue_id", sa.Integer(), nullable=True))
    op.add_column("fields", sa.Column("size", sa.String(length=40), nullable=True))
    op.add_column(
        "fields",
        sa.Column(
            "surface_type",
            sa.String(length=20),
            nullable=False,
            server_default="open",
        ),
    )
    op.add_column(
        "fields",
        sa.Column(
            "price_per_hour",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_index("ix_fields_venue_id", "fields", ["venue_id"])
    op.create_foreign_key(
        "fk_fields_venue_id",
        "fields",
        "venues",
        ["venue_id"],
        ["id"],
        ondelete="CASCADE",
    )

    manual_booking_status = sa.Enum(
        "booked",
        "cancelled",
        "completed",
        name="manual_booking_status",
        create_type=False,
    )
    manual_booking_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "manual_bookings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("field_id", sa.Integer(), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("customer_name", sa.String(length=120), nullable=True),
        sa.Column("customer_phone", sa.String(length=20), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", manual_booking_status, nullable=False, server_default="booked"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_manual_bookings_owner_id", "manual_bookings", ["owner_id"])
    op.create_index("ix_manual_bookings_field_id", "manual_bookings", ["field_id"])
    op.create_index(
        "ix_manual_bookings_booking_date", "manual_bookings", ["booking_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_manual_bookings_booking_date", table_name="manual_bookings")
    op.drop_index("ix_manual_bookings_field_id", table_name="manual_bookings")
    op.drop_index("ix_manual_bookings_owner_id", table_name="manual_bookings")
    op.drop_table("manual_bookings")
    sa.Enum(name="manual_booking_status").drop(op.get_bind(), checkfirst=True)

    op.drop_constraint("fk_fields_venue_id", "fields", type_="foreignkey")
    op.drop_index("ix_fields_venue_id", table_name="fields")
    op.drop_column("fields", "price_per_hour")
    op.drop_column("fields", "surface_type")
    op.drop_column("fields", "size")
    op.drop_column("fields", "venue_id")

    op.drop_index("ix_venues_owner_id", table_name="venues")
    op.drop_table("venues")
