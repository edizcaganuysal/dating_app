"""add_genie_sentinel_user

Revision ID: 718d732c24d3
Revises: 90a8c94251b9
Create Date: 2026-03-22 17:09:37.155590

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '718d732c24d3'
down_revision: Union[str, None] = '90a8c94251b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GENIE_USER_ID = '00000000-0000-0000-0000-000000000001'


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO users (id, email, first_name, last_name, gender, age, password_hash,
                          is_email_verified, is_selfie_verified, is_admin, is_suspended,
                          university_domain, friend_code)
        VALUES ('{GENIE_USER_ID}', 'genie@lovegenie.app', 'Genie', '', 'other', 0, 'disabled',
                true, true, true, false, 'lovegenie.app', 'GENIE0')
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM users WHERE id = '{GENIE_USER_ID}'")
