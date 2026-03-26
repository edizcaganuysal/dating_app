"""drop interested bool from romantic_interests

Revision ID: d7f2e5a91c38
Revises: c3d9f1e82a47
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa

revision = "d7f2e5a91c38"
down_revision = "c3d9f1e82a47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("romantic_interests", "interested")


def downgrade() -> None:
    op.add_column(
        "romantic_interests",
        sa.Column("interested", sa.Boolean(), nullable=True),
    )
    op.execute(
        "UPDATE romantic_interests SET interested = CASE "
        "WHEN interest_level IN ('interested', 'very_interested') THEN true "
        "ELSE false END"
    )
