"""add algorithm_config table and explore flag on date_groups

Revision ID: e5a1c2d38f9b
Revises: d7f2e5a91c38
Create Date: 2026-03-25
"""
import json
import uuid

from alembic import op
import sqlalchemy as sa

revision = "e5a1c2d38f9b"
down_revision = "d7f2e5a91c38"
branch_labels = None
depends_on = None

DEFAULT_WEIGHTS = {
    "att_cohesion": 5.0,
    "role_diversity": 3.0,
    "energy_balance": 1.5,
    "personality_div": 2.5,
    "intent_alignment": 2.0,
    "activity_fit": 1.5,
    "values_baseline": 1.5,
    "friction": 1.5,
    "epsilon": 0.15,
    "num_restarts": 20,
}


def upgrade() -> None:
    op.create_table(
        "algorithm_config",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.add_column(
        "date_groups",
        sa.Column("is_explore", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    # Seed default matching weights
    weights_json = json.dumps(DEFAULT_WEIGHTS)
    op.execute(
        f"INSERT INTO algorithm_config (id, key, value, created_at, updated_at) "
        f"VALUES ('{uuid.uuid4()}', 'matching_weights', '{weights_json}'::jsonb, now(), now())"
    )


def downgrade() -> None:
    op.drop_column("date_groups", "is_explore")
    op.drop_table("algorithm_config")
