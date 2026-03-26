# Yuni — Implementation Plan

Based on research findings in `documentation/research.txt`. See `STEPS.md` for executable prompts.

---

## Phase 1: Instrumentation & Baseline (2 weeks)

**Goal:** Start collecting data to measure every future change. No user-facing changes.

| Task | Files | Evidence |
|------|-------|----------|
| 1.1 Create `analytics_events` table | `backend/app/models/analytics.py`, new migration | Need baseline metrics before any changes |
| 1.2 Create `group_outcomes` table | `backend/app/models/analytics.py`, new migration | Stores group features + conversion signals |
| 1.3 Log key events (profile_view, message_sent, feedback_submitted, match_revealed, date_proposed) | `backend/app/services/analytics_service.py` (new) | Every signal feeds the learning loop |
| 1.4 Track implicit chat signals (message_count, response_time per chat room per user) | `backend/app/websocket/` handlers | Chat engagement predicts follow-through |
| 1.5 Add gender ratio monitoring | `backend/app/routers/admin.py`, dashboard | Gender ratio is the #1 market health metric |
| 1.6 Compute baseline metrics (conversion rate, match rate, by activity, by group size) | `backend/app/services/analytics_service.py` | Can't improve what you can't measure |
| 1.7 Add metrics to admin dashboard | `dashboard/src/app/analytics/` (new page) | Real-time visibility |

**Dependencies:** None. Start immediately.

---

## Phase 2: Onboarding Redesign (3 weeks)

**Goal:** Single 7-step, ~5-minute path. Add values assessment. Remove low-evidence signals.

| Task | Files | Evidence |
|------|-------|----------|
| 2.1 Add new User model fields: `values_vector` (JSON list[int]), remove `onboarding_path` distinction | `backend/app/models/user.py` | Values predict comfort (meta: r=0.47 similarity-attraction) |
| 2.2 Update ProfileCreate schema: add values, simplify roles to single-select, cap dealbreakers at 3 | `backend/app/schemas/profile.py` | Fewer questions = higher completion rate |
| 2.3 Remove from schema/matching: `pref_body_type`, `pref_height_range`, `pref_social_energy_range`, `pref_humor_styles`, `pref_communication`, `style_tags`, `exercise`, `sleep_schedule` | `backend/app/schemas/profile.py` | Eastwick & Finkel: stated prefs don't predict |
| 2.4 Alembic migration (add new columns, keep old nullable) | `backend/alembic/versions/` | Backward compatible |
| 2.5 Redesign mobile onboarding: single 7-step flow | `mobile/src/screens/` (onboarding screens) | See flow.txt Phase 1 |
| 2.6 New ValuesScreen with card-flip UI | `mobile/src/screens/ValuesScreen.tsx` (new) | 6 binary pairs, animated, ~30 sec |
| 2.7 Simplify InterestsScreen (~40 items, max 10) | `mobile/src/screens/` | Reduce from 110+ items |
| 2.8 Remove path selection screen | `mobile/src/screens/`, `mobile/src/navigation/` | No more quick/thorough split |
| 2.9 Progressive profiling prompt for existing users | `mobile/src/screens/ProfileUpdatePrompt.tsx` (new) | "Answer 3 quick questions for better matches" |

**Dependencies:** Phase 1 (need instrumentation to measure impact).

---

## Phase 3: Matching Algorithm Overhaul (4 weeks)

**Goal:** Replace pairwise scoring with group-level condition optimization. Default group size = 4.

| Task | Files | Evidence |
|------|-------|----------|
| 3.1 Implement group-level Q scoring function (replaces pairwise) | `backend/app/services/matching_service.py` | Joel et al.: pairwise compatibility is 0% predictable |
| 3.2 Implement scoring components: AttCohesion, RoleDiversity, EnergyBalance, PersonalityDiv, IntentAlignment, ActivityFit, ValuesBaseline, FrictionScore | `backend/app/services/matching_service.py` | Each backed by specific research finding |
| 3.3 Default group size to 4, remove from user selection | `backend/app/services/matching_service.py`, `mobile/src/screens/DateRequestScreen.tsx` | Dunbar: 4-5 optimal. Women inhibited in larger groups. |
| 3.4 Add epsilon-greedy exploration (15% random, decay to 5%) | `backend/app/services/matching_service.py` | Can't learn without exploration |
| 3.5 Add 2-opt local search + 20 random restarts | `backend/app/services/matching_service.py` | ~10% quality improvement over pure greedy |
| 3.6 Create algorithm_config table (learnable weights in DB) | `backend/app/models/algorithm_config.py` (new), migration | Weights updated by learning pipeline |
| 3.7 Activity recommendation engine (sort by predicted conversion) | `backend/app/services/matching_service.py` | Escape rooms > dinner (research prediction) |
| 3.8 Update admin dashboard matching view | `dashboard/src/app/matching/` | Show explore vs exploit groups |

**Dependencies:** Phase 2 (need new user fields for values, simplified roles).

---

## Phase 4: Post-Date Feedback Redesign (3 weeks)

**Goal:** 4-point interest scale, group chemistry ratings, women-submit-first, soft matches.

| Task | Files | Evidence |
|------|-------|----------|
| 4.1 Update FeedbackRating model: add `group_chemistry_rating`, `activity_fit_rating`, `reflection_tags` | `backend/app/models/report.py`, migration | Need these signals for algorithm learning |
| 4.2 Update RomanticInterest model: `interest_level` enum replaces boolean `interested` | `backend/app/models/report.py`, migration | 4-point scale captures "Maybe" signal |
| 4.3 Update feedback schema | `backend/app/schemas/feedback.py` | Match new model fields |
| 4.4 Implement soft match logic | `backend/app/services/feedback_service.py` | "Interested" + "Maybe" = delayed notification |
| 4.5 Women-submit-first logic: hold men's notifications until women complete | `backend/app/services/feedback_service.py` | Female-first: women's responses independent |
| 4.6 Redesign PostDateScreen (3 sections, 65 sec) | `mobile/src/screens/PostDateScreen.tsx` | See flow.txt Phase 6 |
| 4.7 Add soft match notification + reveal screen | `mobile/src/screens/SoftMatchScreen.tsx` (new) | 48h delayed, gentle, no embarrassment |
| 4.8 Add "Would you hang out as friends?" question | Backend + mobile | Separates social vs romantic signal |
| 4.9 Post-date safety check notification | `backend/app/services/notification_service.py` | Female-first safety |

**Dependencies:** Phase 1 (instrumentation), Phase 3 (new scoring needs these signals).

---

## Phase 5: Second-Date Bridge (3 weeks)

**Goal:** Actively facilitate the transition from match to real second date.

| Task | Files | Evidence |
|------|-------|----------|
| 5.1 Create SecondDate model | `backend/app/models/second_date.py` (new), migration | Track second-date proposals and outcomes |
| 5.2 Second-date suggestion engine | `backend/app/services/second_date_service.py` (new) | Auto-generate date idea from shared data |
| 5.3 Venue recommendation (location centroid, ratings) | `backend/app/services/second_date_service.py` | Remove friction in planning |
| 5.4 Mutual availability detection | `backend/app/services/second_date_service.py` | Use date request data for overlap |
| 5.5 Date proposal/acceptance flow | `backend/app/routers/dates.py`, new endpoints | One-tap propose, one-tap accept |
| 5.6 Date suggestion card in chat UI | `mobile/src/screens/ChatScreen.tsx`, new component | See flow.txt Phase 8 |
| 5.7 1-week follow-up nudge | `backend/app/services/notification_service.py` | "Don't let a great connection slip away" |
| 5.8 2-week check-in for conversion tracking | `backend/app/services/notification_service.py`, new endpoint | The gold standard conversion signal |
| 5.9 Re-match mechanism for mutual "Maybe" pairs | `backend/app/services/feedback_service.py` | Recover borderline connections after 2 weeks |
| 5.10 Auto-generated conversation starters for matches | `backend/app/services/feedback_service.py` | Personalized from shared interests/activity |

**Dependencies:** Phase 4 (need 4-point interest scale, soft matches).

---

## Phase 6: Gender Ratio & Growth (2 weeks)

**Goal:** Achieve and maintain 50/50 gender ratio. Female-first growth mechanics.

| Task | Files | Evidence |
|------|-------|----------|
| 6.1 Waitlist system (male waitlist when ratio > 55% male) | `backend/app/services/waitlist_service.py` (new), `backend/app/routers/auth.py` | No women = no app. OSR research. |
| 6.2 Referral system (opposite-gender bonus, priority matching) | `backend/app/services/referral_service.py` (new), `backend/app/routers/referral.py` (new) | Organic ratio rebalancing |
| 6.3 Gender ratio monitoring + admin alerts | `backend/app/services/analytics_service.py`, dashboard | Trigger when ratio exceeds 60/40 |
| 6.4 Pre-date structured prompts (3-day escalation) | `backend/app/services/notification_service.py` | Aron et al.: structured disclosure builds closeness |
| 6.5 Women-confirm-first for group reveals | `backend/app/services/matching_service.py` | Women feel in control |
| 6.6 Share-my-plans feature | `mobile/src/screens/DateDetailScreen.tsx` | One-tap safety share for women |

**Dependencies:** Phase 1 (ratio monitoring needs analytics).

---

## Phase 7: A/B Testing & Learning (3 weeks)

**Goal:** Infrastructure to rigorously test changes and learn optimal weights.

| Task | Files | Evidence |
|------|-------|----------|
| 7.1 Experiment assignment framework | `backend/app/services/experiment_service.py` (new) | hash(user_id + experiment) → bucket |
| 7.2 Automated metric computation per variant | `backend/app/services/experiment_service.py` | Statistical significance testing |
| 7.3 Weight learning pipeline (weekly regression) | `backend/app/services/learning_service.py` (new) | Reward ~ features → update weights |
| 7.4 Activity conversion tracking + energy map updates | `backend/app/services/learning_service.py` | Empirical ideal_energy mapping |
| 7.5 Experiment dashboard page | `dashboard/src/app/experiments/` (new) | Active tests, metrics, significance |
| 7.6 First experiments: group size 4 vs 6, activity recs on/off, pre-date prompts | Config | These are the biggest unknowns |

**Dependencies:** Phases 1-5 (need full instrumentation + features to test).

---

## Phase 8: Collaborative Filtering (4 weeks, requires data)

**Goal:** Learn from behavioral patterns. Only possible after 500+ users, 2000+ date events.

| Task | Files | Evidence |
|------|-------|----------|
| 8.1 Build user × user interest matrix | `backend/app/services/cf_model_service.py` (new) | All romantic interest signals |
| 8.2 Matrix factorization (ALS, d=20) | `backend/app/services/cf_model_service.py` | Learn latent preference dimensions |
| 8.3 Reciprocal scoring: P(mutual) = σ(Uᵢ·Vⱼ) × σ(Uⱼ·Vᵢ) | `backend/app/services/cf_model_service.py` | Dating requires mutual interest |
| 8.4 Blend CF score into Q function (capped β=0.3) | `backend/app/services/matching_service.py` | CF supplements, never dominates |
| 8.5 Weekly batch retraining job | `backend/app/services/cf_model_service.py` | Model improves with data |
| 8.6 Continuous monitoring (conversion drop alerts) | `backend/app/services/analytics_service.py` | Safety net against model drift |

**Dependencies:** Phases 1-7 + 3-6 months of data accumulation.

---

## Priority Summary

```
HIGHEST IMPACT (do first):
  Phase 1 → Phase 2 → Phase 3 → Phase 4

HIGH IMPACT (do next):
  Phase 5 → Phase 6

INFRASTRUCTURE (do when ready):
  Phase 7 → Phase 8
```

Total estimated effort: ~24 weeks across all phases.
Each phase is independently deployable and valuable.
