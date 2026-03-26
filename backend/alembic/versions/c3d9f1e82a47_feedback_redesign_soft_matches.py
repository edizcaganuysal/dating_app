"""feedback redesign and soft matches

Revision ID: c3d9f1e82a47
Revises: b8e1a3c7f920
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c3d9f1e82a47"
down_revision = "b8e1a3c7f920"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- feedback_ratings: add new columns --
    op.add_column("feedback_ratings", sa.Column("group_chemistry_rating", sa.Integer(), nullable=True))
    op.add_column("feedback_ratings", sa.Column("activity_fit_rating", sa.Integer(), nullable=True))
    op.add_column("feedback_ratings", sa.Column("reflection_tags", sa.JSON(), nullable=False, server_default="[]"))

    # -- romantic_interests: add interest_level, friend_interest; keep interested for backward compat --
    op.add_column(
        "romantic_interests",
        sa.Column("interest_level", sa.String(20), nullable=False, server_default="not_interested"),
    )
    op.add_column(
        "romantic_interests",
        sa.Column("friend_interest", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    # Migrate existing data: interested=true -> 'interested', false -> 'not_interested'
    op.execute(
        "UPDATE romantic_interests SET interest_level = CASE WHEN interested = true THEN 'interested' ELSE 'not_interested' END"
    )
    # Make old interested column nullable for backward compat
    op.alter_column("romantic_interests", "interested", nullable=True)

    # -- soft_matches table --
    op.create_table(
        "soft_matches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("interested_user_id", sa.UUID(), nullable=False),
        sa.Column("maybe_user_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("reveal_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["group_id"], ["date_groups.id"]),
        sa.ForeignKeyConstraint(["interested_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["maybe_user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("soft_matches")

    # Restore interested from interest_level
    op.execute(
        "UPDATE romantic_interests SET interested = CASE WHEN interest_level IN ('interested', 'very_interested') THEN true ELSE false END"
    )
    op.alter_column("romantic_interests", "interested", nullable=False)
    op.drop_column("romantic_interests", "friend_interest")
    op.drop_column("romantic_interests", "interest_level")

    op.drop_column("feedback_ratings", "reflection_tags")
    op.drop_column("feedback_ratings", "activity_fit_rating")
    op.drop_column("feedback_ratings", "group_chemistry_rating")
