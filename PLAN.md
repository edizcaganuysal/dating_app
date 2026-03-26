# Yuni — Implementation Plan

Based on research findings in `documentation/research.txt`, calibrated by `documentation/analysis.txt`.

**Conversion target:** 15-20% second-date rate (25%+ stretch goal).

**Key sequencing changes from analysis:**
- Phase 0 added (campus launch — not in original plan)
- A/B testing merged into Phase 1 (measure before you build)
- Feedback redesign moved BEFORE matching algorithm (produces the signal the algorithm needs)
- Gender ratio management moved earlier (existential dependency)

---

## Phase 0: Campus Launch Playbook (1 week planning, ongoing ops)

**Goal:** Acquire the first 200 users (100M + 100F) at the launch campus. The algorithm is useless with <50 users per gender. This is an ops/marketing problem, not an engineering one.

| Task | Owner | Details |
|------|-------|---------|
| 0.1 Recruit 5-10 campus ambassadors | Founders | Student leaders, social connectors, paid or credited |
| 0.2 Design launch event | Founders | A curated group date with 40-50 handpicked users. Multiple groups doing different activities simultaneously. |
| 0.3 Female-first outreach | Founders | Partner with sororities, women's clubs, women in STEM groups. Message: "Your first date is never alone." |
| 0.4 Pre-registration campaign | Founders | Landing page. "Join the waitlist." Track M/F ratio in real time. |
| 0.5 Manual matching protocol | Founders + Admin | For first 3-6 months, admins manually form groups. Algorithm is a fallback. Already in IDEA.md. |
| 0.6 Launch gate | Founders | DO NOT LAUNCH until 100 women have pre-registered. |

**Dependencies:** None. Start before any engineering.

---

## Phase 1: Instrumentation + A/B Framework (3 weeks)

**Goal:** Measurement infrastructure from day one. Cannot improve what you cannot measure. A/B framework included here (moved from Phase 7 in original plan) because unproven features must be testable from the moment they ship.

| Task | Files | Evidence |
|------|-------|----------|
| 1.1 Create `analytics_events` table | `backend/app/models/analytics.py`, migration | Need baseline metrics before any changes |
| 1.2 Create `group_outcomes` table | `backend/app/models/analytics.py`, migration | Stores group features + conversion signals |
| 1.3 Log key events (profile_view, message_sent, feedback_submitted, match_revealed, date_proposed) | `backend/app/services/analytics_service.py` (new) | Every signal feeds the learning loop |
| 1.4 Track implicit chat signals (message_count, response_time per chat room per user) | `backend/app/websocket/` handlers | Chat engagement predicts follow-through |
| 1.5 Gender ratio monitoring + admin alerts | `backend/app/routers/admin.py`, dashboard | Gender ratio is existential. Alert when >60/40. |
| 1.6 Compute baseline metrics (conversion rate, match rate, by activity, by group size) | `backend/app/services/analytics_service.py` | Can't improve what you can't measure |
| 1.7 Metrics admin dashboard page | `dashboard/src/app/analytics/` (new page) | Real-time visibility |
| 1.8 A/B experiment assignment framework | `backend/app/services/experiment_service.py` (new) | hash(user_id + experiment) → bucket |
| 1.9 Experiment model (name, variants, weights, dates, is_active) | `backend/app/models/experiment.py` (new), migration | Persistent experiment config |
| 1.10 Automated metric computation per variant with significance test | `backend/app/services/experiment_service.py` | Two-proportion z-test |
| 1.11 Experiment admin dashboard page | `dashboard/src/app/experiments/` (new) | View active tests, metrics, significance |

**Dependencies:** None. Start immediately after Phase 0 planning.

---

## Phase 2: Onboarding Redesign (3 weeks)

**Goal:** Single 7-step, ~5-minute path. Add values assessment. Remove low-evidence signals.

**A/B TEST:** Values vector ON vs. OFF (test H4 from research.txt)

| Task | Files | Evidence |
|------|-------|----------|
| 2.1 Add `values_vector` to User model (JSON list[int]) | `backend/app/models/user.py` | Similarity-attraction meta: r=0.47 |
| 2.2 Update ProfileCreate schema: add values, single-select roles, cap dealbreakers at 3 | `backend/app/schemas/profile.py` | Fewer questions = higher completion |
| 2.3 Remove from schema/matching: stated preferences (pref_body_type, pref_height_range, pref_social_energy_range, pref_humor_styles, pref_communication, style_tags, exercise, sleep_schedule) | `backend/app/schemas/profile.py` | Eastwick & Finkel: stated prefs don't predict |
| 2.4 Alembic migration (add new columns, keep old nullable) | `backend/alembic/versions/` | Backward compatible |
| 2.5 Redesign mobile onboarding: single 7-step flow | `mobile/src/screens/` | See flow.txt Phase 1 |
| 2.6 New ValuesScreen with card-flip UI | `mobile/src/screens/ValuesScreen.tsx` (new) | 6 binary pairs, animated |
| 2.7 Simplify InterestsScreen (~40 items, max 10) | `mobile/src/screens/` | Reduce from 110+ |
| 2.8 Remove path selection screen | `mobile/src/screens/`, `mobile/src/navigation/` | No more quick/thorough |
| 2.9 Progressive profiling for existing users | `mobile/src/screens/ProfileUpdatePrompt.tsx` (new) | "Answer 3 quick questions for better matches" |

**Dependencies:** Phase 1 (instrumentation to measure impact, A/B framework for values test).

---

## Phase 3: Post-Date Feedback Redesign (3 weeks)

**Goal:** 4-point interest scale, group chemistry ratings, women-submit-first, soft matches.

**Moved BEFORE matching algorithm** because: the feedback redesign produces the SIGNAL the algorithm needs to learn. Building the algorithm first without the signal is premature.

**A/B TESTS:** 4-point vs. binary (H1), soft matches ON vs. OFF (H3)

| Task | Files | Evidence |
|------|-------|----------|
| 3.1 Update FeedbackRating model: add `group_chemistry_rating`, `activity_fit_rating`, `reflection_tags` | `backend/app/models/report.py`, migration | Signals for algorithm learning |
| 3.2 Update RomanticInterest: `interest_level` enum replaces boolean | `backend/app/models/report.py`, migration | 4-point captures "Maybe" |
| 3.3 Add `friend_interest` field to RomanticInterest | `backend/app/models/report.py` | Separates social vs romantic |
| 3.4 Update feedback schema | `backend/app/schemas/feedback.py` | Match new model fields |
| 3.5 Implement soft match logic | `backend/app/services/feedback_service.py` | "Interested" + "Maybe" = delayed notification |
| 3.6 Women-submit-first: hold men's notifications until women complete (24h timeout) | `backend/app/services/feedback_service.py` | Female-first: women's responses independent |
| 3.7 Redesign PostDateScreen (3 sections, ~65 sec) | `mobile/src/screens/PostDateScreen.tsx` | See flow.txt Phase 6 |
| 3.8 SoftMatchScreen for 48h delayed reveal | `mobile/src/screens/SoftMatchScreen.tsx` (new) | Gentle, no embarrassment |
| 3.9 Post-date safety check notification | `backend/app/services/notification_service.py` | Female-first safety |

**Dependencies:** Phase 1 (instrumentation + A/B framework).

---

## Phase 4: Matching Algorithm Overhaul (4 weeks)

**Goal:** Replace pairwise scoring with group-level condition optimization. Default group size = 4.

| Task | Files | Evidence |
|------|-------|----------|
| 4.1 Implement group-level Q scoring function | `backend/app/services/matching_service.py` | Joel et al.: pairwise is 0% predictable |
| 4.2 Implement all scoring components (AttCohesion, RoleDiversity, EnergyBalance, PersonalityDiv, IntentAlignment, ActivityFit, ValuesBaseline, FrictionScore) | `backend/app/services/matching_service.py` | Each backed by research |
| 4.3 Default group size to 4, remove from UI | `backend/app/services/matching_service.py`, `mobile/src/screens/DateRequestScreen.tsx` | Dunbar, women inhibited in larger groups |
| 4.4 Add epsilon-greedy exploration (15% → 5% over 6 months, decayed monthly) | `backend/app/services/matching_service.py` | Can't learn without exploration |
| 4.5 Add 2-opt local search + 20 random restarts | `backend/app/services/matching_service.py` | ~10% quality improvement |
| 4.6 Create algorithm_config table (learnable weights in DB) | `backend/app/models/algorithm_config.py` (new), migration | Weights updated weekly |
| 4.7 Activity recommendation: sort by tier + show "popular" badge | `backend/app/services/matching_service.py` | Research: escape rooms > dinner |
| 4.8 Update admin dashboard matching view | `dashboard/src/app/matching/` | Show explore vs exploit |

**Dependencies:** Phase 3 (need feedback signals for learning), Phase 2 (need values + simplified roles).

---

## Phase 5: Gender Ratio & Growth (2 weeks)

**Goal:** Achieve and maintain 50/50 gender ratio. Existential dependency.

**Moved BEFORE second-date bridge** because: no women = no app. Must be in place before growth.

| Task | Files | Evidence |
|------|-------|----------|
| 5.1 Waitlist system (male waitlist when ratio > 55%) | `backend/app/services/waitlist_service.py` (new), `backend/app/routers/auth.py` | OSR research |
| 5.2 Referral system (opposite-gender bonus) | `backend/app/services/referral_service.py` (new), `backend/app/routers/referral.py` (new) | Organic rebalancing |
| 5.3 Gender ratio monitoring + admin alerts | `backend/app/services/analytics_service.py`, dashboard | Trigger at 60/40 |
| 5.4 Pre-date structured prompts (3-day escalation) | `backend/app/services/notification_service.py` | Aron et al. (A/B test: H2) |
| 5.5 Women-confirm-first for group reveals | `backend/app/services/matching_service.py` | Women feel in control |
| 5.6 Share-my-plans feature | `mobile/src/screens/DateDetailScreen.tsx` | One-tap safety share |

**Dependencies:** Phase 1 (ratio monitoring needs analytics).

---

## Phase 6: Second-Date Bridge (3 weeks)

**Goal:** Actively facilitate match → real second date. This is where 94% of speed-dating value dies.

| Task | Files | Evidence |
|------|-------|----------|
| 6.1 Create SecondDate model | `backend/app/models/second_date.py` (new), migration | Track proposals + outcomes |
| 6.2 Second-date suggestion engine | `backend/app/services/second_date_service.py` (new) | Auto-generate from shared data |
| 6.3 Venue recommendation | `backend/app/services/second_date_service.py` | Remove friction |
| 6.4 Mutual availability detection | `backend/app/services/second_date_service.py` | Date request data overlap |
| 6.5 Date proposal/acceptance endpoints | `backend/app/routers/dates.py` | One-tap flow |
| 6.6 Date suggestion card in chat UI | `mobile/src/screens/ChatScreen.tsx` | See flow.txt Phase 8 |
| 6.7 1-week follow-up nudge | `backend/app/services/notification_service.py` | Momentum preservation |
| 6.8 2-week check-in (conversion tracking) | `backend/app/services/notification_service.py` | Gold standard signal |
| 6.9 Re-match mechanism for mutual "Maybe" pairs | `backend/app/services/feedback_service.py` | Recover borderline connections |
| 6.10 Auto-generated conversation starters | `backend/app/services/feedback_service.py` | Personalized from shared data |

**Dependencies:** Phase 3 (4-point scale, soft matches), Phase 4 (matching produces the groups).

---

## Phase 7: Weight Learning Pipeline (2 weeks)

**Goal:** Algorithm learns from outcomes. Weights stop being guesses, start being data.

| Task | Files | Evidence |
|------|-------|----------|
| 7.1 Reward signal computation (composite R from Section 7.5 of research) | `backend/app/services/learning_service.py` (new) | Multiple signal types weighted |
| 7.2 Weekly regression: Reward ~ group features → update weights | `backend/app/services/learning_service.py` | Bayesian updating |
| 7.3 Activity conversion tracking + energy map updates | `backend/app/services/learning_service.py` | Empirical ideal_energy |
| 7.4 First A/B experiments launch: group size 4 vs 6, pre-date prompts, activity recs | Config | Biggest unknowns |

**Dependencies:** Phases 1-6, plus 4-8 weeks of accumulated date data.

---

## Phase 8: Collaborative Filtering (4 weeks, deferred)

**Goal:** Learn from behavioral patterns. Only after 500+ users, 2000+ date events.

| Task | Files | Evidence |
|------|-------|----------|
| 8.1 Build user × user interest matrix | `backend/app/services/cf_model_service.py` (new) | All romantic interest signals |
| 8.2 Matrix factorization (ALS, d=20) | `backend/app/services/cf_model_service.py` | Latent preference dimensions |
| 8.3 Reciprocal scoring | `backend/app/services/cf_model_service.py` | P(mutual) = σ(Uᵢ·Vⱼ) × σ(Uⱼ·Vᵢ) |
| 8.4 Blend CF into Q function (capped β=0.3) | `backend/app/services/matching_service.py` | Supplements, never dominates |
| 8.5 Weekly batch retraining | `backend/app/services/cf_model_service.py` | Model improves with data |
| 8.6 Monitoring (conversion drop alerts) | `backend/app/services/analytics_service.py` | Safety net |

**Dependencies:** Phases 1-7 + 3-6 months data accumulation.

---

## Execution Summary

```
Phase 0: Campus Launch Playbook    — 1 week planning (FOUNDERS, not engineering)
Phase 1: Instrumentation + A/B     — 3 weeks
Phase 2: Onboarding Redesign       — 3 weeks
Phase 3: Feedback Redesign         — 3 weeks
Phase 4: Matching Algorithm        — 4 weeks
Phase 5: Gender Ratio & Growth     — 2 weeks
Phase 6: Second-Date Bridge        — 3 weeks
Phase 7: Weight Learning           — 2 weeks
Phase 8: Collaborative Filtering   — 4 weeks (deferred)
                                     ────────
                            TOTAL:   ~25 weeks (Phases 1-7)

MVP (minimum to launch with real users):
  Phase 0 + Phase 1 + Phase 2 + Phase 3 = 10 weeks
  (Admin matching handles groups; algorithm redesign follows)
```
