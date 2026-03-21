"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2026-03-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("university_domain", sa.String(100), nullable=False),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("email_otp", sa.String(6), nullable=True),
        sa.Column("is_selfie_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("no_show_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("program", sa.String(200), nullable=True),
        sa.Column("year_of_study", sa.Integer(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("photo_urls", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("interests", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("age_range_min", sa.Integer(), nullable=False, server_default=sa.text("18")),
        sa.Column("age_range_max", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("attractiveness_score", sa.Float(), nullable=False, server_default=sa.text("5.0")),
        sa.Column("elo_score", sa.Float(), nullable=False, server_default=sa.text("1000.0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Vibe Answers
    op.create_table(
        "vibe_answers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("question", sa.String(500), nullable=False),
        sa.Column("answer", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Date Requests
    op.create_table(
        "date_requests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("group_size", sa.Integer(), nullable=False),
        sa.Column("activity", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Availability Slots
    op.create_table(
        "availability_slots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("date_request_id", sa.Uuid(), sa.ForeignKey("date_requests.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time_window", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Pre-Group Friends
    op.create_table(
        "pre_group_friends",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("date_request_id", sa.Uuid(), sa.ForeignKey("date_requests.id"), nullable=False),
        sa.Column("friend_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Date Groups
    op.create_table(
        "date_groups",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("activity", sa.String(100), nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("scheduled_time", sa.String(20), nullable=False),
        sa.Column("venue_name", sa.String(200), nullable=True),
        sa.Column("venue_address", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'upcoming'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Group Members
    op.create_table(
        "group_members",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date_request_id", sa.Uuid(), sa.ForeignKey("date_requests.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Chat Rooms
    op.create_table(
        "chat_rooms",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("room_type", sa.String(10), nullable=False),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Chat Participants
    op.create_table(
        "chat_participants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("chat_rooms.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Chat Messages
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("chat_rooms.id"), nullable=False),
        sa.Column("sender_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("message_type", sa.String(10), nullable=False, server_default=sa.text("'text'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Matches
    op.create_table(
        "matches",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=False),
        sa.Column("user1_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user2_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("chat_room_id", sa.Uuid(), sa.ForeignKey("chat_rooms.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Feedback Ratings
    op.create_table(
        "feedback_ratings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("experience_rating", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Romantic Interests
    op.create_table(
        "romantic_interests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=False),
        sa.Column("from_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("to_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("interested", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Blocked Pairs
    op.create_table(
        "blocked_pairs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("blocker_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("blocked_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Reports
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("reporter_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reported_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("group_id", sa.Uuid(), sa.ForeignKey("date_groups.id"), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("blocked_pairs")
    op.drop_table("romantic_interests")
    op.drop_table("feedback_ratings")
    op.drop_table("matches")
    op.drop_table("chat_messages")
    op.drop_table("chat_participants")
    op.drop_table("chat_rooms")
    op.drop_table("group_members")
    op.drop_table("date_groups")
    op.drop_table("pre_group_friends")
    op.drop_table("availability_slots")
    op.drop_table("date_requests")
    op.drop_table("vibe_answers")
    op.drop_table("users")
