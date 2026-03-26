# Yuni — Project Context

## What This Is

Yuni is a group dating app for university students. Users are matched into groups of 4-6, go on activity-based group dates, then privately indicate mutual romantic interest afterward. Mutual matches get a 1-on-1 chat. Read IDEA.md for the full product spec.

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL
- **Mobile**: React Native (Expo SDK 52), TypeScript, React Navigation 7
- **Admin Dashboard**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Real-time**: WebSockets (FastAPI native WebSocket support)
- **Auth**: JWT (python-jose), bcrypt via passlib
- **Testing**: pytest + pytest-asyncio (backend), Jest + @testing-library/react-native (mobile), Jest + @testing-library/react (dashboard)

## Directory Structure

```
dating_app/
├── CLAUDE.md, IDEA.md, PITCH.md
├── build.sh                    # Autonomous build orchestrator
├── docker-compose.yml          # PostgreSQL dev + test
├── .env, .env.example
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app, CORS, router includes
│       ├── config.py           # pydantic-settings, reads env vars
│       ├── database.py         # async engine, sessionmaker, get_db
│       ├── models/             # SQLAlchemy models
│       │   ├── __init__.py     # Re-exports all models
│       │   ├── user.py         # User, VibeAnswer
│       │   ├── group.py        # DateGroup, GroupMember
│       │   ├── date_request.py # DateRequest, AvailabilitySlot, PreGroupFriend
│       │   ├── match.py        # Match
│       │   ├── chat.py         # ChatRoom, ChatMessage, ChatParticipant
│       │   └── report.py       # Report, BlockedPair, FeedbackRating, RomanticInterest
│       ├── schemas/            # Pydantic v2 request/response schemas
│       ├── routers/            # FastAPI routers (thin — call services)
│       ├── services/           # Business logic
│       ├── middleware/          # Auth dependency
│       └── websocket/          # WS connection manager + handlers
│   └── tests/
│       ├── conftest.py         # Shared fixtures (async client, test DB)
│       └── test_*.py
├── mobile/
│   ├── App.tsx
│   ├── app.json, package.json, tsconfig.json
│   └── src/
│       ├── api/                # Axios client + domain-specific API modules
│       ├── screens/            # One file per screen
│       ├── components/         # Reusable UI components
│       ├── navigation/         # AppNavigator (stack + tabs)
│       ├── context/            # AuthContext
│       ├── hooks/              # useAuth, useChat
│       └── types/              # TypeScript interfaces
└── dashboard/
    ├── package.json, tsconfig.json, next.config.ts
    └── src/
        ├── lib/api.ts          # Fetch wrapper for admin API
        └── app/                # Next.js App Router pages
```

## Code Conventions

### Backend (Python)

- **Async everywhere**: use `async def`, `AsyncSession`, `asyncpg`
- **All routers prefixed with `/api`**: e.g., `/api/auth/login`, `/api/profiles/me`
- **Thin routers**: routers validate input and call services. Business logic lives in `services/`.
- **SQLAlchemy 2.0 style**: use `mapped_column()`, `Mapped[]` type hints, `DeclarativeBase`
- **UUIDs for all primary keys**: `uuid.uuid4()`, stored as `UUID` type in PostgreSQL
- **Timestamps on all tables**: `created_at` and `updated_at` with `server_default=func.now()`
- **Pydantic v2 schemas**: use `model_config = ConfigDict(from_attributes=True)` for ORM mode
- **HTTP status codes**: 201 create, 200 read/update, 204 delete, 400/401/403/404/409/422 errors
- **Error format**: `{"detail": "Human-readable message"}`
- **Config via pydantic-settings**: `Settings` class in `config.py`, reads from environment variables
- **Dependencies**: `get_db` for database session, `get_current_user` for auth, `get_admin_user` for admin-only

### Mobile (TypeScript)

- **Functional components only**, hooks for state
- **API layer in `src/api/`**: one file per domain (auth.ts, profiles.ts, dates.ts, chat.ts, feedback.ts)
- **Screens in `src/screens/`**: one file per screen, named `XxxScreen.tsx`
- **Shared types in `src/types/index.ts`**: interfaces matching backend schemas
- **Auth state in `src/context/AuthContext.tsx`**: React Context with `useAuth()` hook
- **Navigation in `src/navigation/AppNavigator.tsx`**: stack navigator with auth/main flows
- **Use `axios`** for HTTP with base URL from environment, token interceptor
- **Use `@react-native-async-storage/async-storage`** for token persistence

### Dashboard (TypeScript)

- **Next.js App Router** (app/ directory)
- **Server components by default**, `"use client"` only when needed for interactivity
- **Tailwind CSS for all styling**, no CSS modules or styled-components
- **API calls in `src/lib/api.ts`** using fetch with credentials
- **Each page is its own directory** under `src/app/`

## Testing Requirements

### Backend
- **Every router must have tests** in `tests/test_<router_name>.py`
- **Use `httpx.AsyncClient`** with `ASGITransport` for async test client
- **Test database**: separate PostgreSQL database `yuni_test` (same Docker container, different DB)
- **conftest.py**: async fixtures for test client, test DB session, auto-migrate before session, clean tables between tests
- **Run with**: `cd backend && python -m pytest tests/ -v`

### Mobile
- **Every API module must have tests** (mock axios)
- **Key screens must have render tests** using `@testing-library/react-native`
- **TypeScript must compile**: `npx tsc --noEmit` must exit 0
- **Run with**: `cd mobile && npx tsc --noEmit && npx jest --passWithNoTests`

### Dashboard
- **API module must have tests** (mock fetch)
- **Key pages must render** using `@testing-library/react`
- **Must build**: `npx tsc --noEmit` and `npm run build` must exit 0
- **Run with**: `cd dashboard && npx tsc --noEmit && npx jest --passWithNoTests && npm run build`

## Database Connection

- **Dev**: `postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_dev`
- **Test**: `postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_test`
- Defined in `docker-compose.yml`, port 5433 to avoid conflicts with local PostgreSQL

## Critical Business Rules

1. Only `.edu` or recognized university domains (`.utoronto.ca`, `.mail.utoronto.ca`) can register
2. Group sizes are exactly 4 or 6, with equal gender split (2M/2F or 3M/3F)
3. Pre-grouped friends must be the same gender as the requesting user
4. **Blocked pairs** (explicit "do not match again") can NEVER be in the same group
5. **Dealbreakers** are HARD filters — if user A has "smoking" as dealbreaker and user B smokes regularly, they cannot be grouped
6. Not indicating romantic interest is NEUTRAL — only explicit blocks prevent future grouping
7. Mutual romantic interest (both say yes) creates a Match and auto-creates a 1-on-1 ChatRoom
8. Group chat stays open permanently after the date
9. 3 no-shows without notice -> account suspension
10. **Private preferences** (age range, dealbreakers) are NEVER exposed to other users
11. **Relationship intent** IS shown publicly on profiles
12. Admin endpoints require `is_admin=True` on the User model
13. Selfie verification requires admin approval — `selfie_status` goes from "none" → "pending" → "verified"/"rejected"

## Onboarding

Users choose between Quick (6 steps) or Thorough (9 steps) onboarding. Thorough collects personality, lifestyle, social style, and dealbreakers which improve matching quality. All data is selection-based (no free text except one optional prompt).

## Matching Algorithm

Score = interest_overlap + vibe_alignment*1.5 + personality_score*2.0 + lifestyle_score + intent_bonus - attractiveness_variance - dealbreaker_penalty

## Future Features

See TODO.md for planned future improvements. **Do NOT implement items from TODO.md unless explicitly instructed by the user.**

## Testing Workflow

When the user needs to test changes, automatically:
1. Kill and restart the backend: `lsof -ti:8000 | xargs kill -9 2>/dev/null; cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &`
2. Kill and restart the dashboard: `lsof -ti:3000 | xargs kill -9 2>/dev/null; cd dashboard && npm run dev -- -p 3000 &`
3. Tell the user to run `npx expo start --clear` in their own terminal for the mobile app
4. Verify backend is healthy with `curl -s http://localhost:8000/api/health`

Do NOT ask the user to start backend or dashboard manually — just do it.

## Git Commits

When making git commits, do NOT include any Co-Authored-By lines or AI attribution. All commits are authored by the user. Keep commit messages clean and professional.

## Honesty Rules

**NEVER claim a task is complete if it isn't actually working.** Specifically:
- If a feature depends on an API key, environment variable, or external service — **verify it's actually configured and working** before claiming success. Test it end-to-end.
- If you add code with guards like `if settings.SOME_KEY:` that silently skip the feature when unconfigured — **that's not implementing the feature**. Flag it.
- If a feature can't be implemented as requested (e.g., native module not available in Expo Go), **tell the user immediately** with the exact limitation and alternatives. Don't silently downgrade.
- If you're unsure whether something works, **say so**. "I wrote the code but couldn't verify it works because X" is always better than "Done!"
- When the user asks for something specific, either do it exactly or explain why you're doing it differently. Never silently ignore instructions.

## Dev Build Setup

The project uses a **development build** (not Expo Go) for testing. To rebuild and install:
```
cd mobile
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home ANDROID_HOME=~/Library/Android/sdk npx expo run:android
```
After first build, just run `npx expo start --dev-client` and relaunch the app on the phone.

## README.md Auto-Update

After completing any major change, **automatically update README.md** before telling the user the task is done. Major changes include:

- **Matching algorithm** changes (scoring formula, hard constraints, batch formation, AI matching logic)
- **User flow** changes (onboarding steps, dating flow, post-date flow, navigation restructuring)
- **API endpoint** additions, removals, or signature changes
- **Database schema** changes (new models, new fields on existing models, removed fields)
- **Business rule** changes (group sizes, gender rules, dealbreaker logic, no-show policy, verification rules)
- **New screens** added or existing screens significantly redesigned
- **New services** or major service rewrites
- **Admin dashboard** new pages or significant feature additions
- **Tech stack** changes (new dependencies, framework upgrades)

**What to update:**
1. Update the relevant section(s) in README.md to reflect the change
2. Add a row to the **Changelog** table at the bottom with the date and a brief description
3. If a new API endpoint was added, add it to the API Reference table
4. If a new screen was added, add it to the Mobile App screens table
5. If a new model was added, add it to the Database Schema table

**Do NOT update README.md for:**
- Bug fixes that don't change behavior
- Style/UI tweaks (colors, spacing, animations)
- Code refactoring that doesn't change external behavior
- Test additions
- Comment or documentation-only changes

## Current Phase

All 18 build phases complete. Onboarding overhaul complete.
