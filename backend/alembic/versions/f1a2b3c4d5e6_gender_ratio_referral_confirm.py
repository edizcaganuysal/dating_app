"""add referred_by to users, confirmed and notified_at to group_members

Revision ID: f1a2b3c4d5e6
Revises: e5a1c2d38f9b
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "e5a1c2d38f9b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # User: referred_by FK to users.id
    op.add_column("users", sa.Column("referred_by", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_users_referred_by",
        "users",
        "users",
        ["referred_by"],
        ["id"],
    )

    # GroupMember: confirmed bool, notified_at timestamp
    op.add_column(
        "group_members",
        sa.Column("confirmed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "group_members",
        sa.Column("notified_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("group_members", "notified_at")
    op.drop_column("group_members", "confirmed")
    op.drop_constraint("fk_users_referred_by", "users", type_="foreignkey")
    op.drop_column("users", "referred_by")
