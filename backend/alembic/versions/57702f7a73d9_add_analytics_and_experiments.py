"""add_analytics_and_experiments

Revision ID: 57702f7a73d9
Revises: 10c0760f6a0c
Create Date: 2026-03-25 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57702f7a73d9'
down_revision: Union[str, None] = '10c0760f6a0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # analytics_events table
    op.create_table('analytics_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analytics_events_event_type'), 'analytics_events', ['event_type'])
    op.create_index('ix_analytics_events_user_type_date', 'analytics_events', ['user_id', 'event_type', 'created_at'])

    # group_outcomes table
    op.create_table('group_outcomes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('group_id', sa.Uuid(), nullable=False),
        sa.Column('activity', sa.String(length=100), nullable=False),
        sa.Column('group_size', sa.Integer(), nullable=False),
        sa.Column('mean_attractiveness', sa.Float(), nullable=False),
        sa.Column('std_attractiveness', sa.Float(), nullable=False),
        sa.Column('mean_energy', sa.Float(), nullable=False),
        sa.Column('std_energy', sa.Float(), nullable=False),
        sa.Column('role_diversity_score', sa.Float(), nullable=False),
        sa.Column('n_mutual_matches', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('n_soft_matches', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mean_experience_rating', sa.Float(), nullable=True),
        sa.Column('mean_chemistry_rating', sa.Float(), nullable=True),
        sa.Column('conversion_rate', sa.Float(), nullable=True),
        sa.Column('is_explore_group', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['date_groups.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id')
    )

    # experiments table
    op.create_table('experiments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('variants', sa.JSON(), nullable=False),
        sa.Column('variant_weights', sa.JSON(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_experiments_name'), 'experiments', ['name'], unique=True)

    # experiment_assignments table
    op.create_table('experiment_assignments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('experiment_id', sa.Uuid(), nullable=False),
        sa.Column('variant', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'experiment_id', name='uq_user_experiment')
    )
    op.create_index('ix_experiment_assignments_exp_variant', 'experiment_assignments', ['experiment_id', 'variant'])


def downgrade() -> None:
    op.drop_index('ix_experiment_assignments_exp_variant', table_name='experiment_assignments')
    op.drop_table('experiment_assignments')
    op.drop_index(op.f('ix_experiments_name'), table_name='experiments')
    op.drop_table('experiments')
    op.drop_table('group_outcomes')
    op.drop_index('ix_analytics_events_user_type_date', table_name='analytics_events')
    op.drop_index(op.f('ix_analytics_events_event_type'), table_name='analytics_events')
    op.drop_table('analytics_events')
