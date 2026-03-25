# Yuni

Group dating app for university students. Get matched into a group of 4-6,
go on a group date, connect with whoever you vibe with.

## Matching Algorithm

Yuni uses a 3-stage AI-powered matching pipeline designed to scale to 1M+ users.

### Stage 1: Batch Formation (Every 15 minutes)

Pending date requests are grouped into batches of ~100 users through deterministic clustering:

1. **Strict filters** — Activity and time are absolute. Users who picked "dinner" on Friday at 7PM are never mixed with "bowling on Saturday at 2PM".
2. **Location clustering** — Users within ~50km of each other are grouped together. Users without location data go into "anywhere" batches.
3. **Attractiveness tiers** — Within each location cluster, users are split into three tiers (lower 1-3.9, mid 4-6.9, higher 7-10) based on AI-scored photo attractiveness. This ensures groups have similar attractiveness levels. Soft boundaries allow tier-edge users to move if it helps fill batches.
4. **Personality similarity** — Within each tier, users are sub-clustered by a 4D personality vector: `[social_energy, relationship_intent, interest_overlap, lifestyle_score]`. Euclidean distance determines similarity.

Each resulting cluster of 80-120 users becomes one `MatchingBatch`.

### Stage 2: AI Group Matching (Triggered per batch)

When a batch is ready (full, or 2h/6h deadline), it's sent to OpenAI GPT-4o-mini in a single API call:

- **Input**: ~100 anonymized user profiles (gender, age, interests, personality, lifestyle, preferences about others, dealbreakers, pre-group friends, attractiveness tier)
- **Output**: Optimal group assignments (4 or 6 people, equal gender split) with compatibility scores and reasoning
- **Cost**: ~$0.003 per batch ($30 for 1M users)
- **Fallback**: If OpenAI is unavailable, a deterministic scoring algorithm runs locally

**Trigger conditions:**
- Batch full (>=80 users): match immediately
- 2-hour old batch (>=8 users): match if AI quality score >= 7/10, otherwise wait
- 6-hour hard deadline: force match regardless of quality

**Post-AI validation**: Every proposed group is re-checked against hard constraints (age ranges, dealbreakers, blocked pairs, gender balance). AI is not trusted blindly.

### Stage 3: Admin Approval

AI-proposed groups are saved as `ProposedGroup` records for admin review:
- Admin dashboard shows group cards with member photos, AI compatibility score, and reasoning
- Admin can approve, reject, or edit groups
- Approved groups become real `DateGroup` records with auto-created chat rooms and push notifications
- Rejected users return to the pending pool for the next cycle

### Hard Constraints (Cannot Be Violated)

| Constraint | Rule |
|---|---|
| Gender balance | Exactly 2M+2F (size 4) or 3M+3F (size 6) |
| Age range | Every member must fall within every other member's preferred age range |
| Dealbreakers | Smoking/heavy drinking/too quiet/too loud dealbreakers are absolute |
| Blocked pairs | Users who explicitly blocked each other are never grouped |
| Pre-group friends | Friends who requested to be together must be in the same group |

### Attractiveness Scoring (Hybrid)

Photos are scored by OpenAI Vision on upload and during selfie verification:
- Scored on multiple dimensions: overall attractiveness, photo quality, grooming, style
- Bad lighting/angles are accounted for (photo_quality scored separately)
- Admin can override scores manually
- Re-scored when photos are changed

## How It Works

1. **Sign up** with your university email (.edu or recognized Canadian university domains)
2. **Create a profile** with photos, bio, interests, and vibe answers
3. **Request a date** — pick an activity (bowling, karaoke, dinner, etc.), group size (4 or 6), and availability
4. **Get matched** into a balanced group (equal gender split) based on shared interests, vibe compatibility, and age preferences
5. **Go on the group date** — use icebreakers and venue suggestions to get the conversation flowing
6. **Submit feedback** — rate the experience and privately indicate romantic interest
7. **Mutual matches** unlock a 1-on-1 chat

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for PostgreSQL)

### Setup

1. **Start the database:**

   ```bash
   docker compose up -d
   ```

2. **Backend:**

   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   python -m app.seed  # seed demo data
   uvicorn app.main:app --reload
   ```

   API runs at http://localhost:8000

3. **Admin Dashboard:**

   ```bash
   cd dashboard
   npm install
   npm run dev
   ```

   Open http://localhost:3000

   Login: `admin@mail.utoronto.ca` / `admin123`

4. **Mobile App:**

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

   Scan the QR code with Expo Go (iOS/Android)

### Environment Variables

Copy `.env.example` to `.env` at the project root:

```
DATABASE_URL=postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_dev
DATABASE_TEST_URL=postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_test
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## API Documentation

Interactive API docs (Swagger UI): http://localhost:8000/docs

## Running Tests

```bash
# Backend (89 tests)
cd backend && python -m pytest tests/ -v

# Mobile (32 tests)
cd mobile && npx tsc --noEmit && npx jest

# Dashboard (6 tests)
cd dashboard && npx tsc --noEmit && npx jest --passWithNoTests && npm run build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL |
| Mobile | React Native (Expo SDK 52), TypeScript, React Navigation 7 |
| Dashboard | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Real-time | WebSockets (FastAPI native) |
| Auth | JWT (python-jose), bcrypt via passlib |

## Project Structure

```
dating_app/
├── CLAUDE.md, IDEA.md, PITCH.md
├── build.sh                    # Build orchestrator
├── docker-compose.yml          # PostgreSQL dev + test
├── .env, .env.example
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                # Database migrations
│   └── app/
│       ├── main.py             # FastAPI app, CORS, router includes
│       ├── config.py           # Settings from environment variables
│       ├── database.py         # Async engine, session, get_db
│       ├── models/             # SQLAlchemy ORM models
│       ├── schemas/            # Pydantic v2 request/response schemas
│       ├── routers/            # API route handlers
│       ├── services/           # Business logic (matching, feedback, etc.)
│       ├── middleware/          # JWT auth dependency
│       ├── websocket/          # WebSocket connection manager + handlers
│       ├── seed.py             # Demo data seeder
│       └── tests/              # pytest + pytest-asyncio test suite
├── mobile/
│   ├── App.tsx
│   └── src/
│       ├── api/                # Axios client + API modules
│       ├── screens/            # One file per screen
│       ├── components/         # Reusable UI components
│       ├── navigation/         # Stack + tab navigators
│       ├── context/            # AuthContext
│       ├── hooks/              # useAuth, useChat
│       └── types/              # TypeScript interfaces
└── dashboard/
    └── src/
        ├── lib/api.ts          # Fetch wrapper for admin API
        └── app/                # Next.js App Router pages
```

## Key Business Rules

- Only `.edu` or recognized university domains can register
- Groups are exactly 4 or 6 members with equal gender split (2M/2F or 3M/3F)
- Pre-grouped friends must be the same gender
- Blocked pairs can never be in the same group again
- Mutual romantic interest auto-creates a 1-on-1 chat room
- Private preferences (age range) are never exposed to other users
- 3 no-shows without notice triggers account suspension
