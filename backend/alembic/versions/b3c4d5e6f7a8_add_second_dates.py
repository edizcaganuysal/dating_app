"""add second_dates table

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = "b3c4d5e6f7a8"
down_revision = "a2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "second_dates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("match_id", sa.Uuid(), sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("proposer_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("activity", sa.String(100), nullable=False),
        sa.Column("venue_name", sa.String(200), nullable=True),
        sa.Column("venue_address", sa.Text(), nullable=True),
        sa.Column("proposed_date", sa.Date(), nullable=False),
        sa.Column("proposed_time", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="suggested"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("second_dates")
