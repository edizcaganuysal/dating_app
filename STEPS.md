# Yuni — Implementation Steps

Each step below is a prompt to send to Claude Code. Copy-paste them one at a time, in order. Each prompt is self-contained with context and instructions.

**Legend:**
- 🟢 = Paste directly (auto-execute mode / edit mode)
- 🔵 = Enter plan mode first (`/plan` or type "enter plan mode"), then paste
- ⏸️ = Manual step (you do something, not Claude)

---

## Phase 1: Instrumentation & Baseline

### Step 1.1 🔵
```
Enter plan mode. Plan the analytics instrumentation for Yuni.

Create an analytics system with two new database tables:
1. `analytics_events` table: id (UUID), user_id (UUID FK), event_type (str), event_data (JSON), session_id (str nullable), created_at (datetime)
2. `group_outcomes` table: id (UUID), group_id (UUID FK), activity (str), group_size (int), mean_attractiveness (float), std_attractiveness (float), mean_energy (float), std_energy (float), role_diversity_score (float), n_mutual_matches (int), n_soft_matches (int), mean_experience_rating (float nullable), mean_chemistry_rating (float nullable), conversion_rate (float nullable), created_at (datetime)

Create:
- backend/app/models/analytics.py with both models
- backend/app/services/analytics_service.py with: log_event(), compute_group_outcome(), get_baseline_metrics(), get_gender_ratio()
- Alembic migration for both tables
- Register models in backend/app/models/__init__.py

Follow all existing code conventions (async, UUID PKs, mapped_column, etc). Read existing models first for patterns.
```

### Step 1.2 🟢
```
Add analytics event logging to existing services. Read the following files first, then add log_event() calls at key points:

1. backend/app/services/feedback_service.py — log "feedback_submitted" when feedback is created
2. backend/app/websocket/ handlers — log "message_sent" when a chat message is sent (include chat_room_id in event_data)
3. backend/app/routers/dates.py — log "date_request_created" when a new date request is made
4. backend/app/services/feedback_service.py — log "match_revealed" when a mutual match is created

Import and call analytics_service.log_event() at each point. Don't change any existing logic — just add the logging calls.
```

### Step 1.3 🟢
```
Add gender ratio monitoring to the admin dashboard.

1. Add a new endpoint GET /api/admin/analytics/gender-ratio to backend/app/routers/admin.py that returns: { "male_count": int, "female_count": int, "ratio": float, "status": "balanced" | "male_heavy" | "female_heavy" }. Status is "balanced" if ratio is between 0.45 and 0.55.

2. Add a new endpoint GET /api/admin/analytics/baseline that returns: total_users, total_dates, total_matches, overall_conversion_rate, conversion_by_activity (dict), conversion_by_group_size (dict), female_retention_rate.

Read existing admin router patterns first.
```

---

## Phase 2: Onboarding Redesign

### Step 2.1 🔵
```
Enter plan mode. Plan the onboarding redesign for Yuni.

Read the current state:
- backend/app/models/user.py (all user fields)
- backend/app/schemas/profile.py (ProfileCreate schema)
- mobile/src/screens/ (all onboarding screens)

The goal is to merge quick/thorough into a single 7-step onboarding path based on research. Changes needed:

Backend:
1. Add to User model: values_vector (JSON list of 6 ints, each 0 or 1)
2. Change group_role from list to Optional[str] (single select)
3. Cap dealbreakers at max 3 in schema validation
4. Remove from ProfileCreate required fields: make exercise, sleep_schedule, style_tags, pref_body_type, pref_height_range, pref_social_energy_range, pref_humor_styles, pref_communication truly unused (keep columns for backward compat, remove from schema)
5. Alembic migration

Mobile:
1. Remove the path selection screen (no more quick/thorough)
2. Create new ValuesScreen.tsx — 6 binary forced-choice cards with swipe animation
3. Simplify InterestsScreen: reduce to ~40 items, cap at 10 selections
4. Simplify group role to single select instead of multi-select
5. Update navigation to use single 7-step flow

Plan the exact changes needed, then I'll approve for implementation.
```

### Step 2.2 🟢
```
Implement the backend changes for onboarding redesign based on the approved plan. Create the Alembic migration, update the User model and ProfileCreate schema. Read existing files first to match patterns exactly.
```

### Step 2.3 🟢
```
Implement the mobile onboarding redesign. Create the new single 7-step flow:
1. Photos + Selfie
2. Basics (auto-populated)
3. What You're Looking For (intent, age range, max 3 dealbreakers)
4. Values (NEW — 6 binary card-flip pairs)
5. Vibe in Groups (energy slider + single role select)
6. Activities + Interests (streamlined)
7. Prompts (2 of 10)

Read the existing onboarding screens first. Remove the path selection screen. Create ValuesScreen.tsx with animated card-flip for each binary choice. Update AppNavigator.tsx for the new flow. Keep the existing UI style and component patterns.
```

---

## Phase 3: Matching Algorithm

### Step 3.1 🔵
```
Enter plan mode. Plan the matching algorithm overhaul.

Read backend/app/services/matching_service.py thoroughly — understand every function.

The goal is to replace pairwise compatibility scoring with GROUP-LEVEL condition optimization. Key changes:

1. Replace compute_group_score() with a new Q(G) function that scores the GROUP as a whole:
   - AttCohesion: -variance of attractiveness scores (weight 5.0)
   - RoleDiversity: unique roles / group size + catalyst bonus (weight 3.0)
   - EnergyBalance: penalty for extreme std, optimal std ≈ 1.0 (weight 1.5)
   - PersonalityDiv: entropy of attribute vectors (weight 2.5)
   - IntentAlignment: same intent bonus (weight 2.0)
   - ActivityFit: energy-activity alignment (weight 1.5)
   - ValuesBaseline: moderate cross-gender Hamming distance (weight 1.5)
   - FrictionScore: diet/logistics conflicts (weight -1.5)

2. Default group size to 4 (remove from user-facing UI)

3. Add epsilon-greedy exploration: 15% random valid groups

4. Add 2-opt local search + 20 random restarts to greedy assignment

5. Create algorithm_config table to store learnable weights

Plan the exact refactoring, keeping all hard constraint logic unchanged.
```

### Step 3.2 🟢
```
Implement the matching algorithm overhaul based on the approved plan. Replace the pairwise scoring with group-level Q function. Add epsilon-greedy, local search, and random restarts. Create the algorithm_config model and migration. Default group size to 4.
```

### Step 3.3 🟢
```
Update the mobile DateRequestScreen to remove group size selection (default to 4). Add activity recommendations — sort activities by a "popularity" field and show "🔥 Most popular" badge on the top activity. Read the existing screen first.
```

---

## Phase 4: Post-Date Feedback

### Step 4.1 🔵
```
Enter plan mode. Plan the post-date feedback redesign.

Read:
- backend/app/models/report.py (FeedbackRating, RomanticInterest, BlockedPair, Report)
- backend/app/schemas/feedback.py
- backend/app/services/feedback_service.py
- mobile/src/screens/PostDateScreen.tsx

Changes needed:

1. FeedbackRating model: add group_chemistry_rating (int 1-5), activity_fit_rating (int 1-5), reflection_tags (JSON list of strings)
2. RomanticInterest model: replace boolean `interested` with `interest_level` enum: "not_interested", "maybe", "interested", "very_interested"
3. Add friend_interest field to RomanticInterest: boolean "would hang out as friends"
4. FeedbackCreate schema: update to match
5. Soft match logic in feedback_service: if one person says "interested"/"very_interested" and the other says "maybe", create a SoftMatch record (new model) with 48h reveal timer
6. Women-submit-first: add logic to hold men's match notifications until all women in the group have submitted feedback
7. Update match detection: "interested" or "very_interested" on BOTH sides = full match
8. Mobile PostDateScreen: 3-section redesign with 4-point scale

Plan the exact changes.
```

### Step 4.2 🟢
```
Implement the backend changes for post-date feedback redesign based on the approved plan. Update models, schemas, services. Create the SoftMatch model. Implement women-submit-first logic. Create Alembic migration.
```

### Step 4.3 🟢
```
Implement the mobile PostDateScreen redesign. 3 sections:
Section 1: Group experience (overall 1-5 stars, group chemistry 1-5, activity fit 1-5)
Section 2: Per-person impressions (4-point interest scale with cards, friend question)
Section 3: Quick reflection (multi-select tags, optional)

Read the existing PostDateScreen.tsx first. Keep the existing UI patterns and styling.
```

### Step 4.4 🟢
```
Create the SoftMatchScreen.tsx for mobile. This screen handles the 48-hour delayed soft match reveal:

1. User gets a notification: "Someone from your group is interested in seeing you again"
2. Screen shows: "Someone liked you! Tap to reveal." with a blurred profile photo
3. Tap reveals the person's name, photos, shared interests
4. Two options: "Yes, connect!" (creates match + chat) or "No thanks" (dismissed quietly)

If user taps yes, open the 1-on-1 chat with a gentle starter message. Read existing MatchRevealScreen for patterns.
```

---

## Phase 5: Second-Date Bridge

### Step 5.1 🔵
```
Enter plan mode. Plan the second-date bridge system — the feature that actively helps mutual matches arrange a real second date.

This is a NEW system. Design:

1. SecondDate model: id, match_id (FK), proposer_id, activity, venue_name, venue_address, proposed_date, proposed_time, status (proposed/accepted/declined/expired), created_at, updated_at

2. SecondDateSuggestion service: given a Match, generate a date suggestion by:
   - Finding an activity related to the original group date
   - Picking a venue between both users' locations (simplified: just suggest based on activity type)
   - Finding mutual availability overlap

3. Endpoints: POST /api/dates/second-date/propose, POST /api/dates/second-date/respond, GET /api/dates/second-date/suggestions/{match_id}

4. Scheduled jobs:
   - 48h after match: generate and send suggestion
   - 7 days after match: follow-up nudge if no second date
   - 14 days after match: "How's it going?" check-in

5. Mobile: DateSuggestionCard component in chat, SecondDateScreen for proposal/response

Plan the complete system.
```

### Step 5.2 🟢
```
Implement the SecondDate backend: model, migration, service, router endpoints. Based on the approved plan.
```

### Step 5.3 🟢
```
Implement the mobile second-date bridge UI. Create:
1. DateSuggestionCard component (shows in 1-on-1 chat — activity, venue, time, "Propose" button)
2. SecondDateProposalScreen (the other person sees: accept/suggest alternative/not this week)
3. CheckInScreen (2-week check-in: met up / still chatting / fizzled / prefer not to say)

Read existing chat and match screens for patterns.
```

---

## Phase 6: Gender Ratio & Growth

### Step 6.1 🔵
```
Enter plan mode. Plan the gender ratio management system.

Features needed:
1. Waitlist: When male signups exceed 55% on a campus, new male users go on a waitlist. Show position. "Invite a female friend to skip the line."
2. Referral system: Each user gets a referral code. Referring an opposite-gender friend gives priority matching for next date.
3. Women-confirm-first for group reveals: Women see and confirm group composition before men are notified.
4. Pre-date structured prompts: Auto-send escalating conversation prompts in group chat at Day -3, -2, -1, and day-of.
5. Share-my-plans: One-tap button to share date details with a friend outside the app.

Read existing auth flow, matching service, and notification patterns. Plan the implementation.
```

### Step 6.2 🟢
```
Implement the waitlist and referral system based on the approved plan. Backend models, services, and endpoints. Update the auth/signup flow to check gender ratio before allowing registration.
```

### Step 6.3 🟢
```
Implement pre-date structured prompts. Add a scheduled job or notification service that sends 4 escalating prompts to the group chat:
- Day -3: Icebreaker ("controversial food opinion")
- Day -2: Personal ("something you're weirdly proud of")
- Day -1: Anticipation ("what are you looking forward to?")
- Day of, -2h: Fun ("drop your outfit check")

Also implement women-confirm-first: modify the group reveal notification logic so women are notified first, and men only after all women confirm. Read existing matching_service and notification patterns.
```

### Step 6.4 🟢
```
Implement the share-my-plans feature on mobile. Add a "Share My Plans" button on the date detail screen that opens the native share sheet with a pre-formatted message: "I'm going on a Yuni group date! [Activity] at [Venue], [Date/Time]. Group: [First names]. I'll check in after!" Read existing date detail screens for patterns.
```

---

## Phase 7: A/B Testing & Learning

### Step 7.1 🔵
```
Enter plan mode. Plan the A/B testing and weight learning infrastructure.

1. Experiment service: assign users to experiment variants via hash(user_id + experiment_name). Experiment model with name, variants (JSON), weights, start/end dates, is_active.
2. Metric computation: for each experiment, compute conversion rate, match rate, chemistry rating per variant. Two-proportion z-test for significance.
3. Weight learning: weekly batch job that runs linear regression — Reward ~ group features → update algorithm_config weights with regularization.
4. Admin dashboard page for experiments.

Plan the implementation.
```

### Step 7.2 🟢
```
Implement the A/B testing framework and weight learning pipeline based on the approved plan.
```

---

## Phase 8: Collaborative Filtering

> ⏸️ **Wait until you have 500+ users and 2000+ date events before starting Phase 8.**

### Step 8.1 🔵
```
Enter plan mode. Plan the collaborative filtering system for Yuni.

Build a user-user interest matrix from all RomanticInterest records. Apply matrix factorization (Alternating Least Squares, d=20 latent dimensions). Compute reciprocal match probability: P(mutual) = sigmoid(U_i . V_j) * sigmoid(U_j . V_i). Blend into the matching Q function with weight beta, capped at 0.3.

Weekly batch retraining. Monitoring for conversion drops. Plan the implementation.
```

### Step 8.2 🟢
```
Implement the collaborative filtering system based on the approved plan.
```

---

## Verification Steps

After each phase, run these checks:

### ⏸️ After Phase 1:
```
Verify analytics: curl http://localhost:8000/api/admin/analytics/gender-ratio and curl http://localhost:8000/api/admin/analytics/baseline. Both should return valid JSON.
```

### ⏸️ After Phase 2:
```
Test onboarding: Create a new account through the mobile app. Verify single 7-step flow works end-to-end. Check that values_vector is saved correctly in the database.
```

### ⏸️ After Phase 3:
```
Test matching: Create 4+ test users with date requests. Run matching. Verify groups of 4 are formed. Check that group scores use the new Q function. Verify epsilon-greedy produces some random groups.
```

### ⏸️ After Phase 4:
```
Test feedback: Submit post-date feedback with the 4-point scale. Verify full matches (both "interested") create a match. Verify soft matches (one "interested" + one "maybe") create a SoftMatch record. Verify women-submit-first holds men's notifications.
```

### ⏸️ After Phase 5:
```
Test second-date bridge: Create a mutual match. Verify a second-date suggestion appears in the 1-on-1 chat within 48 hours. Test propose/accept flow.
```

### ⏸️ After Phase 6:
```
Test gender ratio: Signup with a male account when ratio is >55% male. Verify waitlist. Test referral code. Verify pre-date prompts appear in group chat. Test share-my-plans button.
```
