# Yuni — Group Dating App for University Students

> Get matched into a group. Go on a real date. Connect with who you vibe with.

Yuni is a group dating app that replaces swiping with real-life interaction. Users are matched into groups of 4-6 university students, go on activity-based group dates, then privately indicate romantic interest. Mutual matches unlock 1-on-1 chat.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [User Flows](#user-flows)
- [Matching Algorithm](#matching-algorithm)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Mobile App](#mobile-app)
- [Admin Dashboard](#admin-dashboard)
- [Business Rules](#business-rules)
- [Environment & Setup](#environment--setup)
- [Testing](#testing)
- [Changelog](#changelog)

---

## How It Works

1. **Sign up** with a university email (.edu or recognized Canadian domains)
2. **Build a profile** — photos, interests, vibe questions, optional personality/lifestyle data
3. **Request a date** — pick an activity, group size (4 or 6), availability, optional friends
4. **Get matched** — algorithm forms optimal groups with equal gender split
5. **Group chat opens** — meet your group, plan logistics, get venue suggestions from Yuni AI
6. **Go on the date** — bowling, karaoke, dinner, escape room, etc.
7. **Post-date feedback** — rate experience, indicate romantic interest, block/report if needed
8. **Mutual match?** — both say yes = 1-on-1 chat unlocked. Group chat stays open forever.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL |
| Mobile | React Native (Expo SDK 54), TypeScript, React Navigation 7 |
| Admin Dashboard | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Real-time | WebSockets (FastAPI native) |
| Auth | JWT (python-jose), bcrypt via passlib |
| AI | OpenAI GPT-4o-mini (matching + chat assistant + image verification) |
| Push Notifications | Expo Push Notifications |
| Testing | pytest (backend), Jest (mobile + dashboard) |

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Mobile App │────▶│   FastAPI    │────▶│   PostgreSQL     │
│  (Expo/RN)  │◀────│   Backend   │◀────│   (port 5433)    │
└─────────────┘     └──────┬──────┘     └──────────────────┘
                           │
┌─────────────┐     ┌──────┴──────┐     ┌──────────────────┐
│  Dashboard  │────▶│  WebSocket  │     │   OpenAI API     │
│  (Next.js)  │     │  (Chat)     │     │  (Matching + AI) │
└─────────────┘     └─────────────┘     └──────────────────┘
```

### Directory Structure

```
dating_app/
├── README.md                   # This file — living documentation
├── CLAUDE.md                   # AI assistant instructions
├── IDEA.md                     # Full product spec
├── PITCH.md                    # Investor pitch
├── TODO.md                     # Future features
├── build.sh                    # 18-phase build orchestrator
├── docker-compose.yml          # PostgreSQL dev + test
├── .env / .env.example         # Environment variables
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + background crons
│   │   ├── config.py           # pydantic-settings
│   │   ├── database.py         # Async engine + session
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic v2 request/response
│   │   ├── routers/            # API endpoints (thin)
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # JWT auth dependency
│   │   └── websocket/          # WS connection manager
│   ├── alembic/                # Database migrations
│   └── tests/                  # pytest async tests
│
├── mobile/
│   └── src/
│       ├── api/                # Axios API modules
│       ├── screens/            # 14 screens
│       ├── components/         # 12 reusable components
│       ├── navigation/         # Stack + tab navigation
│       ├── context/            # AuthContext
│       ├── hooks/              # useChat, useNotifications, useUnreadCount
│       ├── theme/              # Design system
│       ├── types/              # TypeScript interfaces
│       └── utils/              # Animations, haptics
│
└── dashboard/
    └── src/app/                # Next.js App Router (9 pages)
```

---

## User Flows

### Registration & Onboarding

```
Login/Register → Email OTP Verification → Profile Setup Path Selection
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              Quick (6 steps)        Thorough (9 steps)
                              - Photos               - Photos
                              - Interests             - Interests
                              - Prompts               - Prompts
                              - Location              - Location
                              - Preferences           - Preferences
                              - Selfie verify         - Personality
                                                      - Lifestyle
                                                      - Social style
                                                      - Dealbreakers
                                                      - Selfie verify
```

### Dating Flow

```
Create Date Request → Matching (background cron) → Group Revealed
        │                                               │
   Pick activity                                   Group chat opens
   Pick group size (4/6)                           Yuni AI welcomes
   Pick availability                               Venue suggestions
   Add friends (optional)                          Icebreakers
        │                                               │
        └──────────── Date Happens ─────────────────────┘
                           │
                    Post-Date Feedback
                    - Rate experience (1-5)
                    - Indicate romantic interest
                    - Block / Report (optional)
                           │
                    ┌──────┴──────┐
                    │             │
              Mutual Match    No Match
              1-on-1 chat     Group chat
              unlocked        stays open
```

### Navigation Structure (Mobile)

```
Auth Stack:                    Main App (Bottom Tabs):
  - Login                        Home Tab:
  - Register (3-step)              - Home (groups + matches)
  - Verify Email                   - Date Request
  - Profile Setup                  - Group Reveal
                                   - Chat Detail
                                   - Post Date Feedback
                                   - Match Reveal
                                 My Dates Tab:
                                   - Active requests + upcoming groups
                                 Chat Tab:
                                   - Chat Rooms list
                                   - Chat Detail (WebSocket)
                                 Profile Tab:
                                   - Profile view/edit
                                   - Friends
```

---

## Matching Algorithm

The matching system operates in 3 stages:

### Stage 1: Batch Formation (Every 15 min)

Groups pending date requests into ~100-user batches:

1. **Activity + Date** — strict grouping (same activity, same date)
2. **Location clustering** — users within ~50km radius
3. **Attractiveness tiers** — low (<4), mid (4-6.9), high (≥7) based on AI photo scoring
4. **Personality sub-clustering** — Euclidean distance on 4D vector: `[social_energy, intent, interest_overlap, lifestyle]`

### Stage 2: AI Group Formation (Every 15 min, offset 7 min)

OpenAI GPT-4o-mini generates optimal groups from each batch.

**Triggers:**
- Batch ≥80 users → match immediately
- Batch 2h old + ≥8 users → match with quality gate (score ≥7.0)
- Batch 6h old → force match (no quality gate)

**Fallback:** Deterministic scoring algorithm if OpenAI unavailable.

### Stage 3: Admin Approval

Proposed groups go to admin dashboard for review before becoming real groups.

### Hard Constraints (Never Violated)

| Constraint | Rule |
|-----------|------|
| Gender balance | Exactly 2M+2F (groups of 4) or 3M+3F (groups of 6) |
| Age range | Every member within every other member's stated min/max |
| Blocked pairs | Users who blocked each other are NEVER grouped |
| Dealbreakers | Smoking, heavy drinking, too quiet, too loud = hard filter |
| Pre-group friends | Must all appear in the same group or group is rejected |

### Scoring Formula (Deterministic Fallback)

```
Score = interest_overlap × 1.0
      + vibe_score × 1.5
      + personality_score × 2.0
      + lifestyle_score × 1.5
      + communication_score × 1.5
      + intent_score
      + location_score
      + program_bonus (1.0 if 2+ share program)
      + role_diversity × 2.0
      + activity_fit × 1.5
      - diet_penalty
      - attractiveness_variance × 5
```

**Scoring Components:**
- **Interest overlap**: shared interests count
- **Vibe score**: matching vibe question answers
- **Personality**: social energy complementarity (diff=1 is sweet spot = 2.5) + humor overlap (×2.0 each)
- **Lifestyle**: drinking, smoking, exercise, sleep schedule alignment
- **Communication**: preference pairing (caller+caller=2.0, caller+texter=-0.5)
- **Intent**: relationship intent match (serious+serious=3.0, casual+casual=3.0)
- **Location**: haversine distance (≤5km=3.0, ≤10km=2.0, ≤15km=1.0, >max=-100)
- **Role diversity**: diverse group roles (planner+entertainer+connector=+3.0 bonus)
- **Activity fit**: group avg social energy vs. activity ideal (board_games=2, bar=4, karaoke=4)
- **Diet penalty**: incompatible diets (vegan+no_restrictions=1.5)
- **Attractiveness variance**: keeps groups aesthetically balanced

---

## API Reference

All endpoints prefixed with `/api`. Auth via `Authorization: Bearer <JWT>`.

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | - | Register with university email |
| POST | `/login` | - | Login, get JWT |
| POST | `/verify-email` | - | Verify OTP |
| POST | `/resend-otp` | - | Resend verification OTP |
| GET | `/me` | User | Get current user |

### Profiles (`/api/profiles`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | User | Create profile (onboarding) |
| GET | `/me` | User | Get own private profile |
| GET | `/public/{user_id}` | User | Get another user's public profile |
| PUT | `/` | User | Update profile |
| POST | `/photos` | User | Upload photo (AI verified) |
| POST | `/verify-selfie` | User | Photo selfie verification |
| POST | `/verify-video-selfie` | User | Video selfie verification |
| POST | `/location` | User | Update location + distance pref |

### Date Requests (`/api/date-requests`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | User | Create date request |
| GET | `/` | User | List my requests |
| GET | `/{id}` | User | Get single request |
| PATCH | `/{id}` | User | Update request |
| DELETE | `/{id}` | User | Cancel request |

### Matching (`/api/matching`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/my-groups` | User | Get my matched groups |
| POST | `/api/admin/matching/run-batch` | Admin | Trigger batch matching |

### Groups (`/api/groups`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/{group_id}` | User | Group details + members |
| GET | `/{group_id}/icebreakers` | User | AI conversation starters |
| GET | `/{group_id}/venues` | User | Venue suggestions |
| PATCH | `/{group_id}` | Admin | Update venue/time |

### Feedback (`/api/groups/{group_id}/feedback`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | User | Submit feedback + romantic interests |
| GET | `/my-feedback` | User | Get my feedback for group |

### Matches (`/api/matches`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | User | List all my matches |
| GET | `/{match_id}` | User | Get single match |

### Chat (`/api/chat`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| WS | `/api/ws/chat/{room_id}` | Token query | Real-time WebSocket chat |
| GET | `/rooms` | User | List chat rooms |
| GET | `/rooms/{room_id}` | User | Room details |
| GET | `/rooms/{room_id}/messages` | User | Message history (paginated) |
| POST | `/rooms/{room_id}/ask-yuni` | User | Ask Yuni AI assistant |

### Friends (`/api/friends`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | User | List friends |
| POST | `/request` | User | Send friend request |
| POST | `/accept` | User | Accept request |
| GET | `/search` | User | Search users |
| POST | `/add-by-code` | User | Add by friend code |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Admin | List users (search/filter) |
| GET | `/users/{id}` | Admin | User detail |
| POST | `/users` | Admin | Create test user |
| PATCH | `/users/{id}` | Admin | Suspend/promote user |
| GET | `/analytics` | Admin | Platform stats |
| GET | `/pending-requests` | Admin | Pending date requests |
| POST | `/groups` | Admin | Manual group creation |
| GET | `/matching-batches` | Admin | List batches |
| GET | `/matching-batches/{id}` | Admin | Batch detail + proposed groups |
| POST | `/matching-batches/{id}/approve` | Admin | Approve proposed groups |
| GET | `/reports` | Admin | List reports |
| PATCH | `/reports/{id}` | Admin | Update report status |
| GET | `/noshows` | Admin | Check no-show users |

---

## Database Schema

### Core Models

| Model | Table | Purpose |
|-------|-------|---------|
| **User** | `users` | User account + full profile (50+ fields) |
| **VibeAnswer** | `vibe_answers` | User's vibe question responses |
| **DateRequest** | `date_requests` | Request to go on a date (activity, size, status) |
| **AvailabilitySlot** | `availability_slots` | When user is available (date + hours) |
| **PreGroupFriend** | `pre_group_friends` | Friends to group with (same gender) |
| **DateGroup** | `date_groups` | Formed group ready for a date |
| **GroupMember** | `group_members` | User ↔ Group mapping |
| **Match** | `matches` | Mutual romantic match between two users |
| **ChatRoom** | `chat_rooms` | Group or 1-on-1 chat container |
| **ChatParticipant** | `chat_participants` | User ↔ Room mapping |
| **ChatMessage** | `chat_messages` | Individual message |
| **FeedbackRating** | `feedback_ratings` | Post-date experience rating (1-5) |
| **RomanticInterest** | `romantic_interests` | User's interest in another (yes/no) |
| **BlockedPair** | `blocked_pairs` | Permanent "never match again" |
| **Report** | `reports` | User reports (harassment, catfishing, etc.) |
| **Friendship** | `friendships` | Social friend connections |
| **MatchingBatch** | `matching_batches` | ~100 user batch for AI matching |
| **ProposedGroup** | `proposed_groups` | AI-suggested group (pending approval) |
| **ProposedGroupMember** | `proposed_group_members` | User ↔ ProposedGroup mapping |
| **DateRequestTemplate** | `date_request_templates` | Saved reusable request configs |

### Key User Fields

**Profile Basics:** email, name, gender, age, program, year_of_study, photo_urls, interests, prompts, bio, friend_code

**Personality (Thorough only):** social_energy (1-5), humor_styles, communication_pref, conflict_style

**Lifestyle (Thorough only):** drinking, smoking, exercise, diet, sleep_schedule

**Social Style (Thorough only):** group_role, ideal_group_size

**Dealbreakers (Thorough only):** smoking, heavy_drinking, too_quiet, too_loud

**Self-Description (Public):** body_type, height_cm, style_tags, relationship_intent

**Preferences (Private, NEVER exposed):** age range, pref_body_type, pref_height_range, pref_style, pref_social_energy_range, pref_humor_styles, pref_communication

**Verification:** selfie_status (none/pending/verified/rejected), selfie_urls, is_email_verified

**Scoring (Internal):** attractiveness_score (1-10), elo_score (1000 default)

**Location (Private):** latitude, longitude, preferred_max_distance_km (default 25)

---

## Mobile App

### Screens (14 total)

| Screen | Purpose |
|--------|---------|
| **LoginScreen** | Email + password login |
| **RegisterScreen** | 3-step wizard (name/email → password/age → gender) |
| **VerifyEmailScreen** | 6-digit OTP verification |
| **ProfileSetupScreen** | Quick (6 step) or Thorough (9 step) onboarding |
| **HomeScreen** | Dashboard showing groups + matches with countdown |
| **DateRequestScreen** | Create request (activity, size, calendar, friends, templates) |
| **GroupRevealScreen** | View matched group (members, icebreakers, venues) |
| **ChatScreen** | Real-time WebSocket chat with Yuni AI assistant |
| **ChatRoomsScreen** | List all group + 1-on-1 chats |
| **PostDateScreen** | Submit feedback, romantic interests, blocks/reports |
| **MatchRevealScreen** | Celebration screen for mutual matches (animations + haptics) |
| **MyDatesScreen** | Active requests + upcoming groups with countdown |
| **ProfileScreen** | View/edit profile, photos (2x3 grid), interests |
| **FriendsScreen** | Friend list, requests, search, friend codes |

### Key Features

- **WebSocket chat** with auto-reconnect
- **Yuni AI** — in-chat assistant for venue suggestions, icebreakers, planning tips
- **Push notifications** via Expo
- **Animated UI** with spring physics, staggered animations, Lottie
- **Haptic feedback** on all interactions
- **Location picker** with map + radius slider
- **Photo verification** via OpenAI Vision (human check, same-person check, liveness)
- **Unread count** badge on Chat tab (polls every 30s)

### Design System

- **Primary color:** #FF6B6B (warm pink-red)
- **Surface:** #FFF5F0 (warm peachy)
- **Typography:** 11 variants (displayLarge → captionSmall)
- **Spacing:** xxs (2) to xxxxl (40)
- **Animations:** Bouncy, gentle, snappy, dramatic spring presets

---

## Admin Dashboard

Accessible at `http://localhost:3000` with admin credentials.

### Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/dashboard` | Overview stats (users, groups, matches, reports) |
| Matching | `/matching` | Pending requests table, manual group creation, batch matching |
| Create Request | `/matching/create-request` | Create date request for any user |
| Users | `/users` | User list with search/filter/pagination |
| User Detail | `/users/[id]` | Full profile, groups, matches, reports, admin actions |
| Create User | `/users/create` | Create test users |
| Reports | `/reports` | Review/resolve user reports |
| Selfie Review | `/selfie-review` | Approve/reject selfie verifications |
| Analytics | `/analytics` | Platform stats, seed DB, check no-shows |

### Admin Capabilities

- View/search/filter all users
- Suspend/unsuspend accounts
- Promote/demote admins
- Create test users
- Manually form groups
- Run batch matching algorithm
- Approve/reject AI-proposed groups
- Review user reports
- Approve/reject selfie verifications
- Check no-show violations
- View platform analytics

---

## Business Rules

### Registration
- Only `.edu` or recognized university domains (`.utoronto.ca`, `.mail.utoronto.ca`, `.yorku.ca`, `.ryerson.ca`, `.torontomu.ca`, `.ocadu.ca`)
- Password ≥8 chars + 1 uppercase letter
- Email verified via 6-digit OTP

### Groups
- Exactly 4 or 6 members with equal gender split (2M/2F or 3M/3F)
- Pre-grouped friends must be same gender as requester
- Pre-group friends limited to (group_size / 2 - 1)

### Matching
- Blocked pairs can NEVER be in the same group
- Dealbreakers are HARD filters (smoking, heavy_drinking, too_quiet, too_loud)
- Age range preferences are bidirectional (every member must be in range for all others)
- Private preferences (age range, dealbreakers, body type prefs) are NEVER exposed

### Post-Date
- Not indicating interest = neutral (can be regrouped later)
- Explicit block = permanent "never match again"
- Mutual romantic interest → auto-creates Match + 1-on-1 ChatRoom
- Group chat stays open permanently

### Safety
- 3 no-shows → account suspension
- No-show window: 48 hours to submit feedback after date
- Report categories: inappropriate_behavior, harassment, catfishing, other
- Selfie verification: none → pending → verified/rejected

### Verification
- Photos checked by OpenAI Vision: real human, not AI-generated, clear face
- All photos cross-checked: same person
- Selfie: live photo, matches profile, no filters/beauty mode
- Video selfie: 3 frames extracted, liveness + face match
- Fail-closed: any API error = reject (never silently accept)

### Attractiveness Scoring
- Internal only, never shown to users
- 1-10 scale, scored by OpenAI Vision on photo upload
- Dimensions: overall attractiveness, photo quality, grooming, style
- Poor photo quality compensated (bumps score up)
- Used for batch clustering (tier similarity) and group variance penalty

---

## Environment & Setup

### Prerequisites

- Docker (for PostgreSQL)
- Python 3.12+ with venv
- Node.js 18+
- Expo CLI (`npx expo`)

### Quick Start

```bash
# Start PostgreSQL
docker-compose up -d

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Dashboard
cd dashboard
npm install
npm run dev -- -p 3000

# Mobile
cd mobile
npm install
npx expo start --dev-client
```

### Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_dev
DATABASE_TEST_URL=postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_test
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
OPENAI_API_KEY=sk-...              # Optional: enables AI matching, chat, image verification
```

### Database

- **Dev:** `yuni_dev` on port 5433
- **Test:** `yuni_test` on port 5433
- Credentials: `yuni:yuni`
- PostgreSQL 16-alpine via Docker

### Dev Build (Mobile)

```bash
cd mobile
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
ANDROID_HOME=~/Library/Android/sdk \
npx expo run:android
```

After first build, just `npx expo start --dev-client`.

### Test Users

4 hardcoded test accounts auto-login without email verification:
- `tester@mail.utoronto.ca` / `tester2@mail.utoronto.ca` / `tester3@mail.utoronto.ca` / `tester4@mail.utoronto.ca`

---

## Testing

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Mobile
cd mobile && npx tsc --noEmit && npx jest --passWithNoTests

# Dashboard
cd dashboard && npx tsc --noEmit && npx jest --passWithNoTests && npm run build
```

---

## Changelog

Track major changes to critical systems here. Updated automatically after significant modifications.

| Date | Change | Details |
|------|--------|---------|
| 2025-01 | Initial build | All 18 build phases complete |
| 2025-01 | Onboarding overhaul | 3-phase onboarding (Quick 6-step / Thorough 9-step), map + slider location picker |
| 2025-01 | Matching overhaul | 3-stage pipeline: batch formation → AI matching → admin approval |
| 2025-01 | Hourly time picker | Replaced morning/afternoon/evening/night with hour-based availability |
| 2025-01 | Yuni rebrand | Renamed from dating_app to Yuni, test bot chat, map + slider |

---

*This README is automatically updated after major changes. See CLAUDE.md for update instructions.*
