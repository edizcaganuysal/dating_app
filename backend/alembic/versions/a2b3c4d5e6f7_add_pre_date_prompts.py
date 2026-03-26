"""add pre_date_prompts table

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = "a2b3c4d5e6f7"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pre_date_prompts",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("group_id", sa.UUID(), sa.ForeignKey("date_groups.id"), nullable=False),
        sa.Column("room_id", sa.UUID(), sa.ForeignKey("chat_rooms.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("send_at", sa.DateTime(), nullable=False),
        sa.Column("sent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pre_date_prompts_send_at_sent", "pre_date_prompts", ["send_at", "sent"])


def downgrade() -> None:
    op.drop_index("ix_pre_date_prompts_send_at_sent", table_name="pre_date_prompts")
    op.drop_table("pre_date_prompts")
