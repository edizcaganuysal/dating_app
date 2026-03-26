"""add_values_vector_to_users

Revision ID: b8e1a3c7f920
Revises: 57702f7a73d9
Create Date: 2026-03-25 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8e1a3c7f920'
down_revision: Union[str, None] = '57702f7a73d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('values_vector', sa.JSON(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('users', 'values_vector')
