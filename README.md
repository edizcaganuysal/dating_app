# LoveGenie

Group dating app for university students. Get matched into a group of 4-6,
go on a group date, connect with whoever you vibe with.

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
DATABASE_URL=postgresql+asyncpg://lovegenie:lovegenie@localhost:5433/lovegenie_dev
DATABASE_TEST_URL=postgresql+asyncpg://lovegenie:lovegenie@localhost:5433/lovegenie_test
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
