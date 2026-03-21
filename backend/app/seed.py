"""Database seeding script with realistic demo data for LoveGenie."""

import asyncio
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.chat import ChatMessage, ChatParticipant, ChatRoom
from app.models.date_request import AvailabilitySlot, DateRequest
from app.models.group import DateGroup, GroupMember
from app.models.match import Match
from app.models.report import BlockedPair, FeedbackRating, Report, RomanticInterest
from app.models.user import User, VibeAnswer
from app.services.auth_service import hash_password

# --- User data ---

MALE_USERS = [
    {"first_name": "Liam", "last_name": "Chen", "age": 21, "program": "Computer Science", "year": 3,
     "bio": "CS student who codes by day and plays guitar by night.", "interests": ["gaming", "music", "cooking", "fitness"]},
    {"first_name": "Ethan", "last_name": "Patel", "age": 22, "program": "Engineering", "year": 4,
     "bio": "Mechanical engineering major. I build things and break them.", "interests": ["fitness", "sports", "photography", "travel"]},
    {"first_name": "Noah", "last_name": "Kim", "age": 20, "program": "Business", "year": 2,
     "bio": "Rotman Commerce student. Love a good cappuccino and startup talk.", "interests": ["coffee", "reading", "travel", "movies"]},
    {"first_name": "James", "last_name": "Wilson", "age": 23, "program": "Pre-Med", "year": 4,
     "bio": "Future doctor, current nerd. Ask me about molecular bio.", "interests": ["reading", "fitness", "volunteering", "cooking"]},
    {"first_name": "Oliver", "last_name": "Singh", "age": 19, "program": "Economics", "year": 1,
     "bio": "Frosh year econ student exploring Toronto one ramen shop at a time.", "interests": ["food", "movies", "gaming", "music"]},
    {"first_name": "Lucas", "last_name": "Brown", "age": 21, "program": "Math", "year": 3,
     "bio": "Math + stats double major. I promise I'm fun at parties.", "interests": ["hiking", "coffee", "art", "yoga"]},
    {"first_name": "Mason", "last_name": "Lee", "age": 22, "program": "Psychology", "year": 3,
     "bio": "Psych major fascinated by how people think and connect.", "interests": ["reading", "yoga", "music", "volunteering"]},
    {"first_name": "Alexander", "last_name": "Nguyen", "age": 20, "program": "Computer Science", "year": 2,
     "bio": "Hackathon addict. Currently building my third side project.", "interests": ["gaming", "photography", "cooking", "coffee"]},
    {"first_name": "Daniel", "last_name": "Garcia", "age": 24, "program": "English", "year": 4,
     "bio": "English lit major. Will recommend you a book you'll actually finish.", "interests": ["reading", "art", "movies", "dancing"]},
    {"first_name": "William", "last_name": "Thompson", "age": 21, "program": "Biology", "year": 3,
     "bio": "Bio major, plant dad, amateur birder on weekends.", "interests": ["hiking", "photography", "cooking", "travel"]},
]

FEMALE_USERS = [
    {"first_name": "Emma", "last_name": "Wang", "age": 21, "program": "Business", "year": 3,
     "bio": "Rotman gal who loves brunch spots and case competitions.", "interests": ["coffee", "travel", "dancing", "food"]},
    {"first_name": "Sophia", "last_name": "Martinez", "age": 20, "program": "Psychology", "year": 2,
     "bio": "Psych student and part-time barista. I read people, not minds.", "interests": ["reading", "yoga", "art", "movies"]},
    {"first_name": "Ava", "last_name": "Johnson", "age": 22, "program": "Engineering", "year": 4,
     "bio": "Civil engineering. I design bridges and burn them (just kidding).", "interests": ["fitness", "hiking", "photography", "music"]},
    {"first_name": "Isabella", "last_name": "Liu", "age": 19, "program": "Computer Science", "year": 1,
     "bio": "CS frosh! Learning to code and loving every bug.", "interests": ["gaming", "coffee", "music", "cooking"]},
    {"first_name": "Mia", "last_name": "Anderson", "age": 23, "program": "Pre-Med", "year": 4,
     "bio": "Med school hopeful. Anatomy flashcards are my love language.", "interests": ["fitness", "volunteering", "food", "movies"]},
    {"first_name": "Charlotte", "last_name": "Taylor", "age": 21, "program": "Art History", "year": 3,
     "bio": "Art history nerd who drags friends to every gallery opening.", "interests": ["art", "photography", "dancing", "travel"]},
    {"first_name": "Amelia", "last_name": "Park", "age": 20, "program": "Economics", "year": 2,
     "bio": "Econ major with opinions about housing policy and good pasta.", "interests": ["cooking", "reading", "coffee", "sports"]},
    {"first_name": "Harper", "last_name": "Davis", "age": 22, "program": "Biology", "year": 3,
     "bio": "Lab rat by day, yoga enthusiast by evening.", "interests": ["yoga", "hiking", "cooking", "music"]},
    {"first_name": "Evelyn", "last_name": "Robinson", "age": 24, "program": "English", "year": 4,
     "bio": "English major and aspiring writer. Currently drafting novel #2.", "interests": ["reading", "art", "movies", "volunteering"]},
    {"first_name": "Abigail", "last_name": "Zhao", "age": 21, "program": "Math", "year": 3,
     "bio": "Pure math + philosophy. I overthink everything, including this bio.", "interests": ["coffee", "hiking", "gaming", "yoga"]},
]

VIBE_QUESTIONS = [
    ("What's your ideal Friday night?", [
        "Movie marathon with snacks", "Exploring a new restaurant", "Board games with friends",
        "Live music downtown", "Quiet night with a good book",
    ]),
    ("Pick a superpower:", [
        "Teleportation", "Time travel", "Mind reading", "Flying", "Invisibility",
    ]),
    ("What's your coffee order?", [
        "Black coffee, no nonsense", "Oat milk latte", "Iced americano year-round",
        "Matcha latte", "I'm a tea person",
    ]),
    ("How do you handle stress?", [
        "Go for a long walk", "Hit the gym", "Call a friend", "Cook something elaborate",
        "Stress? I thrive on chaos",
    ]),
    ("What's your love language?", [
        "Words of affirmation", "Quality time", "Acts of service", "Physical touch", "Giving gifts",
    ]),
]

DEFAULT_PASSWORD = "Password123!"
ADMIN_EMAIL = "admin@mail.utoronto.ca"
ADMIN_PASSWORD = "admin123"


def _make_email(first: str, last: str) -> str:
    return f"{first.lower()}.{last.lower()}@mail.utoronto.ca"


def _make_photo_urls(name: str) -> list[str]:
    slug = name.lower().replace(" ", "_")
    return [
        f"https://picsum.photos/seed/{slug}/400/500",
        f"https://picsum.photos/seed/{slug}_2/400/500",
    ]


async def seed_database(session: AsyncSession | None = None) -> None:
    """Populate the database with realistic demo data. Idempotent — skips if admin exists."""

    own_session = session is None
    if own_session:
        session = async_session()

    try:
        # Idempotency check
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        if result.scalar_one_or_none() is not None:
            return

        hashed_default = hash_password(DEFAULT_PASSWORD)
        hashed_admin = hash_password(ADMIN_PASSWORD)

        # --- Create 20 users ---
        users: list[User] = []
        attractiveness = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0]
        elo = [800, 850, 900, 950, 1000, 1000, 1050, 1100, 1150, 1200]
        random.shuffle(attractiveness)
        random.shuffle(elo)

        for i, data in enumerate(MALE_USERS):
            is_admin = False
            email = _make_email(data["first_name"], data["last_name"])
            pw = hashed_default
            if i == 0:
                # First male user is the admin
                email = ADMIN_EMAIL
                pw = hashed_admin
                is_admin = True
            user = User(
                id=uuid.uuid4(),
                email=email,
                password_hash=pw,
                first_name=data["first_name"],
                last_name=data["last_name"],
                university_domain="utoronto.ca",
                is_email_verified=True,
                is_selfie_verified=True,
                is_admin=is_admin,
                gender="male",
                age=data["age"],
                program=data["program"],
                year_of_study=data["year"],
                bio=data["bio"],
                photo_urls=_make_photo_urls(f"{data['first_name']} {data['last_name']}"),
                interests=data["interests"],
                attractiveness_score=attractiveness[i],
                elo_score=elo[i],
            )
            session.add(user)
            users.append(user)

        random.shuffle(attractiveness)
        random.shuffle(elo)

        for i, data in enumerate(FEMALE_USERS):
            user = User(
                id=uuid.uuid4(),
                email=_make_email(data["first_name"], data["last_name"]),
                password_hash=hashed_default,
                first_name=data["first_name"],
                last_name=data["last_name"],
                university_domain="utoronto.ca",
                is_email_verified=True,
                is_selfie_verified=True,
                gender="female",
                age=data["age"],
                program=data["program"],
                year_of_study=data["year"],
                bio=data["bio"],
                photo_urls=_make_photo_urls(f"{data['first_name']} {data['last_name']}"),
                interests=data["interests"],
                attractiveness_score=attractiveness[i],
                elo_score=elo[i],
            )
            session.add(user)
            users.append(user)

        await session.flush()

        males = [u for u in users if u.gender == "male"]
        females = [u for u in users if u.gender == "female"]

        # --- Vibe answers (5 per user) ---
        for user in users:
            for q, answers in VIBE_QUESTIONS:
                session.add(VibeAnswer(
                    user_id=user.id,
                    question=q,
                    answer=random.choice(answers),
                ))

        # --- Pending date requests (8 total: 4M, 4F) ---
        next_saturday = date.today() + timedelta(days=(5 - date.today().weekday()) % 7 or 7)
        next_sunday = next_saturday + timedelta(days=1)

        pending_males = males[6:]  # last 4 males
        pending_females = females[6:]  # last 4 females
        activities = ["bowling", "bowling", "dinner", "dinner"]

        for i, user in enumerate(pending_males):
            dr = DateRequest(
                user_id=user.id,
                group_size=4,
                activity=activities[i],
                status="pending",
            )
            session.add(dr)
            await session.flush()
            session.add(AvailabilitySlot(date_request_id=dr.id, date=next_saturday, time_window="18:00-21:00"))
            session.add(AvailabilitySlot(date_request_id=dr.id, date=next_sunday, time_window="14:00-17:00"))

        for i, user in enumerate(pending_females):
            dr = DateRequest(
                user_id=user.id,
                group_size=4,
                activity=activities[i],
                status="pending",
            )
            session.add(dr)
            await session.flush()
            session.add(AvailabilitySlot(date_request_id=dr.id, date=next_saturday, time_window="18:00-21:00"))
            session.add(AvailabilitySlot(date_request_id=dr.id, date=next_sunday, time_window="12:00-15:00"))

        # --- Completed Group 1: bowling, 4 people (2M + 2F) ---
        last_saturday = date.today() - timedelta(days=(date.today().weekday() + 2) % 7 or 7)

        g1_males = males[0:2]  # Liam (admin), Ethan
        g1_females = females[0:2]  # Emma, Sophia
        g1_members = g1_males + g1_females

        group1 = DateGroup(
            activity="bowling",
            scheduled_date=last_saturday,
            scheduled_time="18:00-20:00",
            venue_name="The Ballroom Bowl",
            venue_address="145 John St, Toronto, ON",
            status="completed",
        )
        session.add(group1)
        await session.flush()

        for user in g1_members:
            dr = DateRequest(user_id=user.id, group_size=4, activity="bowling", status="matched")
            session.add(dr)
            await session.flush()
            session.add(GroupMember(group_id=group1.id, user_id=user.id, date_request_id=dr.id))

        # Group 1 chat room
        g1_chat = ChatRoom(room_type="group", group_id=group1.id)
        session.add(g1_chat)
        await session.flush()
        for user in g1_members:
            session.add(ChatParticipant(room_id=g1_chat.id, user_id=user.id))

        # Group 1 feedback
        for user in g1_members:
            session.add(FeedbackRating(
                group_id=group1.id,
                user_id=user.id,
                experience_rating=random.randint(3, 5),
            ))

        # Group 1 romantic interests — Liam <-> Emma mutual, others not
        liam, ethan = g1_males
        emma, sophia = g1_females

        session.add(RomanticInterest(group_id=group1.id, from_user_id=liam.id, to_user_id=emma.id, interested=True))
        session.add(RomanticInterest(group_id=group1.id, from_user_id=emma.id, to_user_id=liam.id, interested=True))
        session.add(RomanticInterest(group_id=group1.id, from_user_id=ethan.id, to_user_id=emma.id, interested=True))
        session.add(RomanticInterest(group_id=group1.id, from_user_id=ethan.id, to_user_id=sophia.id, interested=False))
        session.add(RomanticInterest(group_id=group1.id, from_user_id=sophia.id, to_user_id=liam.id, interested=True))
        session.add(RomanticInterest(group_id=group1.id, from_user_id=sophia.id, to_user_id=ethan.id, interested=False))

        # --- Mutual match: Liam + Emma with direct chat ---
        direct_chat = ChatRoom(room_type="direct")
        session.add(direct_chat)
        await session.flush()
        session.add(ChatParticipant(room_id=direct_chat.id, user_id=liam.id))
        session.add(ChatParticipant(room_id=direct_chat.id, user_id=emma.id))

        match1 = Match(
            group_id=group1.id,
            user1_id=liam.id,
            user2_id=emma.id,
            chat_room_id=direct_chat.id,
        )
        session.add(match1)

        # Some chat messages
        now = datetime.now(timezone.utc)
        messages = [
            (liam.id, "Hey Emma! Had such a great time bowling 🎳", -120),
            (emma.id, "Me too! I can't believe you got three strikes in a row", -115),
            (liam.id, "Beginner's luck haha. Want to grab coffee sometime this week?", -100),
            (emma.id, "I'd love that! How about Wednesday after class?", -90),
            (liam.id, "Perfect, I know a great spot on Bloor", -80),
        ]
        for sender_id, content, minutes_offset in messages:
            session.add(ChatMessage(
                room_id=direct_chat.id,
                sender_id=sender_id,
                content=content,
                message_type="text",
            ))

        # --- Completed Group 2: dinner, 6 people (3M + 3F) ---
        group2_date = last_saturday - timedelta(days=7)
        g2_males = males[2:5]  # Noah, James, Oliver
        g2_females = females[2:5]  # Ava, Isabella, Mia
        g2_members = g2_males + g2_females

        group2 = DateGroup(
            activity="dinner",
            scheduled_date=group2_date,
            scheduled_time="19:00-21:30",
            venue_name="Pai Northern Thai Kitchen",
            venue_address="18 Duncan St, Toronto, ON",
            status="completed",
        )
        session.add(group2)
        await session.flush()

        for user in g2_members:
            dr = DateRequest(user_id=user.id, group_size=6, activity="dinner", status="matched")
            session.add(dr)
            await session.flush()
            session.add(GroupMember(group_id=group2.id, user_id=user.id, date_request_id=dr.id))

        # Group 2 chat room
        g2_chat = ChatRoom(room_type="group", group_id=group2.id)
        session.add(g2_chat)
        await session.flush()
        for user in g2_members:
            session.add(ChatParticipant(room_id=g2_chat.id, user_id=user.id))

        # Group 2 feedback
        for user in g2_members:
            session.add(FeedbackRating(
                group_id=group2.id,
                user_id=user.id,
                experience_rating=random.randint(2, 5),
            ))

        # Group 2 romantic interests (no mutual matches here)
        noah, james, oliver = g2_males
        ava, isabella, mia = g2_females
        session.add(RomanticInterest(group_id=group2.id, from_user_id=noah.id, to_user_id=ava.id, interested=True))
        session.add(RomanticInterest(group_id=group2.id, from_user_id=ava.id, to_user_id=noah.id, interested=False))
        session.add(RomanticInterest(group_id=group2.id, from_user_id=james.id, to_user_id=mia.id, interested=True))
        session.add(RomanticInterest(group_id=group2.id, from_user_id=mia.id, to_user_id=james.id, interested=True))

        # --- Blocked pairs ---
        session.add(BlockedPair(blocker_id=sophia.id, blocked_id=ethan.id))
        session.add(BlockedPair(blocker_id=ava.id, blocked_id=oliver.id))

        # --- Reports ---
        session.add(Report(
            reporter_id=sophia.id,
            reported_id=ethan.id,
            group_id=group1.id,
            category="inappropriate_behavior",
            description="Made uncomfortable comments during the date.",
            status="pending",
        ))
        session.add(Report(
            reporter_id=mia.id,
            reported_id=oliver.id,
            group_id=group2.id,
            category="no_show",
            description="Showed up 45 minutes late without any notice.",
            status="resolved",
            admin_notes="Warning issued to user.",
        ))

        await session.commit()
        print("✅ Database seeded successfully with 20 users and demo data.")

    except Exception:
        await session.rollback()
        raise
    finally:
        if own_session:
            await session.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
