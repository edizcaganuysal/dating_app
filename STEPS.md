# Yuni — Implementation Steps

Matches PLAN.md phase ordering (calibrated by analysis.txt). Copy-paste prompts one at a time, in order.

**Legend:**
- 🟢 = Paste directly (auto-execute mode)
- 🔵 = Enter plan mode first (`/plan`), then paste
- ⏸️ = Manual step (you do something, not Claude)

---

## Phase 0: Campus Launch Playbook

> ⏸️ **This is a founders/ops task, not engineering. Complete before writing code.**

- [ ] Recruit 5-10 campus ambassadors (student leaders, social connectors)
- [ ] Design launch event (40-50 handpicked users, multiple group activities)
- [ ] Partner with women's organizations for female-first outreach
- [ ] Set up pre-registration landing page, track M/F ratio
- [ ] Define manual matching protocol for admins (first 3-6 months)
- [ ] **GATE: Do not launch until 100 women have pre-registered**

---

## Phase 1: Instrumentation + A/B Framework

### Step 1.1 🔵
```
Enter plan mode. Plan the analytics and A/B testing instrumentation for Yuni.

Create a measurement system with:

ANALYTICS:
1. `analytics_events` table: id (UUID), user_id (UUID FK), event_type (str), event_data (JSON), session_id (str nullable), created_at (datetime)
2. `group_outcomes` table: id (UUID), group_id (UUID FK), activity (str), group_size (int), mean_attractiveness (float), std_attractiveness (float), mean_energy (float), std_energy (float), role_diversity_score (float), n_mutual_matches (int), n_soft_matches (int), mean_experience_rating (float nullable), mean_chemistry_rating (float nullable), conversion_rate (float nullable), created_at (datetime)

A/B TESTING:
3. `experiments` table: id (UUID), name (str unique), variants (JSON list), variant_weights (JSON list), start_date (datetime), end_date (datetime nullable), is_active (bool), created_at
4. `experiment_assignments` table: id (UUID), user_id (UUID FK), experiment_id (UUID FK), variant (str), created_at

Create:
- backend/app/models/analytics.py with analytics models
- backend/app/models/experiment.py with experiment models
- backend/app/services/analytics_service.py with: log_event(), compute_group_outcome(), get_baseline_metrics(), get_gender_ratio()
- backend/app/services/experiment_service.py with: assign_variant(user_id, experiment_name), get_variant(user_id, experiment_name), compute_experiment_metrics(experiment_name)
- Alembic migration for all 4 tables
- Register models in backend/app/models/__init__.py

Follow existing code conventions (async, UUID PKs, mapped_column). Read existing models first.
```

### Step 1.2 🟢
```
Add analytics event logging to existing services. Read the following files first, then add log_event() calls:

1. backend/app/services/feedback_service.py — log "feedback_submitted" when feedback is created, log "match_revealed" when mutual match created
2. backend/app/websocket/ handlers — log "message_sent" with chat_room_id in event_data
3. backend/app/routers/dates.py — log "date_request_created"
4. backend/app/routers/profiles.py — log "profile_completed" when profile is first created

Import and call analytics_service.log_event(). Don't change existing logic — just add logging.
```

### Step 1.3 🟢
```
Add admin endpoints for analytics and gender ratio monitoring.

1. GET /api/admin/analytics/gender-ratio → { male_count, female_count, ratio, status: "balanced"|"male_heavy"|"female_heavy" }. "balanced" if between 0.45-0.55.
2. GET /api/admin/analytics/baseline → { total_users, total_dates, total_matches, overall_conversion_rate, conversion_by_activity, conversion_by_group_size, female_retention_rate }
3. GET /api/admin/experiments → list all experiments with current metrics per variant
4. POST /api/admin/experiments → create new experiment
5. GET /api/admin/experiments/{id}/results → metrics per variant with significance test

Read existing admin router patterns first.
```

### ⏸️ Step 1.4 — Verify
```
curl http://localhost:8000/api/admin/analytics/gender-ratio
curl http://localhost:8000/api/admin/analytics/baseline
# Both should return valid JSON
```

---

## Phase 2: Onboarding Redesign

### Step 2.1 🔵
```
Enter plan mode. Plan the onboarding redesign.

Read current state:
- backend/app/models/user.py
- backend/app/schemas/profile.py
- mobile/src/screens/ (all onboarding screens)
- mobile/src/navigation/AppNavigator.tsx

Goal: merge quick/thorough into single 7-step path.

Backend:
1. Add to User model: values_vector (JSON list of 6 ints, each 0 or 1)
2. Change group_role from list to Optional[str] (single select)
3. Cap dealbreakers at max 3 in schema validation
4. Remove from ProfileCreate: exercise, sleep_schedule, style_tags, pref_body_type, pref_height_range, pref_social_energy_range, pref_humor_styles, pref_communication (keep DB columns nullable for backward compat)
5. Alembic migration

Mobile:
1. Remove path selection screen
2. New ValuesScreen.tsx — 6 binary forced-choice cards
3. Simplify InterestsScreen: ~40 items, max 10
4. Single-select group role
5. Update navigation for 7-step flow

Plan the exact changes.
```

### Step 2.2 🟢
```
Implement the backend onboarding changes based on the approved plan. Alembic migration, User model, ProfileCreate schema. Read existing files first.
```

### Step 2.3 🟢
```
Implement the mobile onboarding redesign. Single 7-step flow:
1. Photos + Selfie
2. Basics (auto-populated)
3. What You're Looking For (intent, age range, max 3 dealbreakers)
4. Values (NEW — 6 binary card-flip pairs)
5. Vibe in Groups (energy slider + single role)
6. Activities + Interests (streamlined ~40 items, max 10)
7. Prompts (2 of 10)

Remove path selection screen. Create ValuesScreen.tsx. Update AppNavigator.tsx. Keep existing UI patterns.
```

### ⏸️ Step 2.4 — Verify
```
Create a new account through the mobile app. Verify:
- Single 7-step flow (no quick/thorough choice)
- Values screen works (6 binary pairs)
- values_vector saved in DB as [0,1,1,0,1,0] format
- Dealbreakers capped at 3
- Interests capped at 10
```

---

## Phase 3: Post-Date Feedback Redesign

### Step 3.1 🔵
```
Enter plan mode. Plan the post-date feedback redesign.

Read:
- backend/app/models/report.py (FeedbackRating, RomanticInterest)
- backend/app/schemas/feedback.py
- backend/app/services/feedback_service.py
- mobile/src/screens/PostDateScreen.tsx

Changes:
1. FeedbackRating: add group_chemistry_rating (int 1-5), activity_fit_rating (int 1-5), reflection_tags (JSON list[str])
2. RomanticInterest: replace bool `interested` with `interest_level` enum: "not_interested", "maybe", "interested", "very_interested"
3. Add friend_interest boolean to RomanticInterest
4. New SoftMatch model: id, group_id, interested_user_id, maybe_user_id, status (pending/revealed/accepted/declined/expired), reveal_at (datetime), created_at
5. Soft match logic: one "interested/very_interested" + one "maybe" → create SoftMatch, reveal_at = now + 48h
6. Women-submit-first: hold men's match notifications until all women submit (24h timeout, then release anyway)
7. Full match: both "interested" or "very_interested" → immediate match + chat
8. Elo update: use interest_level as score (not_interested=0, maybe=0.25, interested=0.75, very_interested=1.0)
9. Mobile: 3-section feedback (~65 sec)

Plan all changes.
```

### Step 3.2 🟢
```
Implement backend feedback redesign based on approved plan. Update models, schemas, services. Create SoftMatch model. Women-submit-first logic. Elo update with 4-point scale. Alembic migration.
```

### Step 3.3 🟢
```
Implement mobile PostDateScreen redesign. 3 sections:
Section 1: Group experience (overall stars, chemistry 1-5, activity fit 1-5)
Section 2: Per-person (4-point interest cards, friend question yes/no)
Section 3: Quick reflection tags (optional multi-select)

Keep existing UI patterns and styling.
```

### Step 3.4 🟢
```
Create SoftMatchScreen.tsx for mobile:
1. Notification: "Someone from your group is interested in you"
2. Screen: "Someone liked you! Tap to reveal." (blurred photo)
3. Tap reveals person's name + photos + shared interests
4. "Yes, connect!" → match + chat with gentle starter
5. "No thanks" → dismissed. Other person never notified.

Read existing MatchRevealScreen for patterns.
```

### ⏸️ Step 3.5 — Verify
```
Submit feedback with 4-point scale. Verify:
- Both "interested" → full match created, chat opens
- One "interested" + one "maybe" → SoftMatch record with reveal_at = +48h
- Women-first: men's notification held until women submit
- Elo updates use 4-point scores
```

---

## Phase 4: Matching Algorithm

### Step 4.1 🔵
```
Enter plan mode. Plan the matching algorithm overhaul.

Read backend/app/services/matching_service.py thoroughly.

Replace pairwise scoring with group-level Q function:
- AttCohesion: -variance of attractiveness (weight 5.0)
- RoleDiversity: unique roles/size + catalyst bonus (weight 3.0)
- EnergyBalance: optimal std ≈ 1.0 (weight 1.5)
- PersonalityDiv: entropy of attribute vectors (weight 2.5)
- IntentAlignment: same intent bonus (weight 2.0)
- ActivityFit: energy-activity alignment (weight 1.5)
- ValuesBaseline: moderate Hamming distance (weight 1.5)
- FrictionScore: diet/logistics (weight -1.5)

Default group size to 4. Epsilon-greedy: 15% random, decay 2.5%/month to floor of 5%. 2-opt local search + 20 random restarts. Weights in DB (algorithm_config table).

Keep ALL hard constraint logic unchanged. Plan the refactoring.
```

### Step 4.2 🟢
```
Implement matching algorithm overhaul based on approved plan. Group-level Q function, epsilon-greedy, local search, random restarts, algorithm_config model + migration. Default group size to 4.
```

### Step 4.3 🟢
```
Update mobile DateRequestScreen: remove group size selection. Sort activities by tier (Tier 1 first). Show "🔥 Most popular" badge on highest-tier activity. Read existing screen first.
```

### ⏸️ Step 4.4 — Verify
```
Create 8+ test users (4M, 4F) with date requests. Run matching. Verify:
- Groups of 4 formed (not 6)
- Q function scores used (check logs)
- ~15% of groups are random (epsilon-greedy)
- Weights loaded from algorithm_config table
```

---

## Phase 5: Gender Ratio & Growth

### Step 5.1 🔵
```
Enter plan mode. Plan gender ratio management.

Features:
1. Waitlist: male signups go to waitlist when ratio > 55% male. Show position. "Invite a female friend to skip the line."
2. Referral: each user has referral code. Opposite-gender referral → priority matching.
3. Women-confirm-first: women see + confirm group before men are notified.
4. Pre-date prompts: auto-send escalating prompts in group chat (Day -3, -2, -1, day-of). A/B test: prompts vs. single icebreaker.
5. Share-my-plans: one-tap share date details with friend outside app.

Read existing auth flow, matching service, notification patterns. Plan implementation.
```

### Step 5.2 🟢
```
Implement waitlist and referral system based on approved plan. Update auth/signup to check gender ratio. Backend models, services, endpoints.
```

### Step 5.3 🟢
```
Implement pre-date structured prompts and women-confirm-first:

Prompts (auto-sent to group chat):
- Day -3: "Let's break the ice! Share your most controversial food opinion 🔥"
- Day -2: "What's something you're weirdly proud of?"
- Day -1: "What are you looking forward to tomorrow?"
- Day of, -2h: "Almost time! Drop your outfit check 💫"

Women-confirm-first: women notified of group first. Men only after all women confirm. Read existing matching and notification patterns.
```

### Step 5.4 🟢
```
Implement share-my-plans on mobile. "Share My Plans" button on date detail screen → native share sheet with: "I'm going on a Yuni group date! [Activity] at [Venue], [Date/Time]. Group: [Names]. I'll check in after!" Read existing screens for patterns.
```

### ⏸️ Step 5.5 — Verify
```
- Signup as male when ratio >55% → waitlist screen appears
- Generate referral code, use it → referral tracked
- Women get group notification first; men only after women confirm
- Group chat has 4 escalating prompts at correct times
- Share button works on date detail screen
```

---

## Phase 6: Second-Date Bridge

### Step 6.1 🔵
```
Enter plan mode. Plan the second-date bridge — actively helps matches arrange real second dates.

New system:
1. SecondDate model: id, match_id FK, proposer_id, activity, venue_name, venue_address, proposed_date, proposed_time, status (proposed/accepted/declined/expired), created_at, updated_at
2. Suggestion engine: from match data, suggest activity + venue + time
3. Endpoints: POST propose, POST respond, GET suggestions/{match_id}
4. Scheduled: 48h suggestion card, 7d nudge, 14d check-in
5. Re-match: mutual "Maybe" pairs get "Second Look" notification after 2 weeks
6. Mobile: DateSuggestionCard in chat, proposal/response screens, check-in screen

Plan complete system.
```

### Step 6.2 🟢
```
Implement SecondDate backend: model, migration, service, router. Based on approved plan.
```

### Step 6.3 🟢
```
Implement mobile second-date bridge:
1. DateSuggestionCard component (in 1-on-1 chat)
2. SecondDateProposalScreen (accept / suggest alternative / not this week)
3. CheckInScreen (2-week: met up / chatting / fizzled / prefer not to say)

Read existing chat and match screens for patterns.
```

### ⏸️ Step 6.4 — Verify
```
Create a mutual match. Verify:
- Suggestion card appears in chat within 48h
- Propose/accept flow works
- 2-week check-in notification fires
```

---

## Phase 7: Weight Learning Pipeline

### Step 7.1 🔵
```
Enter plan mode. Plan the weight learning pipeline.

1. Reward signal computation: composite R from multiple signals (interest rate 0.20, match rate 0.25, chemistry 0.10, activity fit 0.05, message sent 0.05, date proposed 0.10, date confirmed 0.15, follow-up positive 0.10)
2. Weekly batch: linear regression Reward ~ group features → update algorithm_config weights with regularization toward current values
3. Activity conversion tracking: compute conversion by (activity, mean_group_energy) → update ideal_energy map
4. Logging and monitoring for weight changes

Plan implementation.
```

### Step 7.2 🟢
```
Implement weight learning pipeline based on approved plan. Weekly regression, activity tracking, weight updates in algorithm_config table.
```

---

## Phase 8: Collaborative Filtering

> ⏸️ **Wait until 500+ users and 2000+ date events.**

### Step 8.1 🔵
```
Enter plan mode. Plan collaborative filtering for Yuni.

User-user interest matrix from RomanticInterest records. Matrix factorization (ALS, d=20). Reciprocal scoring: P(mutual) = sigmoid(U_i · V_j) × sigmoid(U_j · V_i). Blend into Q function, beta capped at 0.3.

Weekly retraining. Conversion drop monitoring. Plan implementation.
```

### Step 8.2 🟢
```
Implement collaborative filtering based on approved plan.
```
