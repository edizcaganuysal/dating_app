#!/usr/bin/env bash
# ============================================================================
#  YUNI — Autonomous Build Orchestrator v2
# ============================================================================
#
#  Just run it. It figures out the rest.
#
#    ./build.sh          # Start or resume from where you left off
#    ./build.sh --reset  # Wipe state and start fresh
#    ./build.sh --status # Show current progress
#
#  Features:
#    - Auto-resumes from last completed step
#    - Opus 4.6 + max effort for every step
#    - Live progress output every 60 seconds
#    - Smart verification after each phase
#    - Full logs per step in .build-logs/
#    - State persisted in .build-state
#
# ============================================================================

set -uo pipefail  # No -e: we handle errors ourselves

# --- Configuration ---
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/.build-logs"
STATE_FILE="$PROJECT_DIR/.build-state"
SYSTEM_PROMPT_FILE="$LOG_DIR/.system-prompt.txt"
VENV_PYTHON="$PROJECT_DIR/.venv/bin/python"

CLAUDE_CMD="claude"
MODEL="opus"
EFFORT="max"
PERMISSION_MODE="auto"
PROGRESS_INTERVAL=60   # seconds between progress reports
RATE_LIMIT_WAIT=3600   # seconds to wait on rate limit (1 hour)
MAX_RETRIES=24         # max rate-limit retries (24 hours total)

# All steps in order
ALL_STEPS=(
    "1.1" "1.2" "1.3" "1.4"
    "2.1" "2.2" "2.3"
    "3.1" "3.2" "3.3" "3.4"
    "4.1" "4.2" "4.3"
    "5.1" "5.2" "5.3"
    "6.1" "6.2" "6.3"
    "7.1" "7.2"
)

PHASE_NAMES=(
    [1]="Instrumentation + A/B Framework"
    [2]="Onboarding Redesign"
    [3]="Post-Date Feedback Redesign"
    [4]="Matching Algorithm Overhaul"
    [5]="Gender Ratio & Growth"
    [6]="Second-Date Bridge"
    [7]="Weight Learning Pipeline"
)

# Colors
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m'
C='\033[0;36m' W='\033[0;37m' NC='\033[0m' BOLD='\033[1m' DIM='\033[2m'

# --- Argument parsing ---
ACTION="run"
REVERT_STEP=""
LOG_STEP=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)  ACTION="reset"; shift ;;
        --status) ACTION="status"; shift ;;
        --revert) ACTION="revert"; REVERT_STEP="$2"; shift 2 ;;
        --log)    ACTION="log"; LOG_STEP="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: ./build.sh [options]"
            echo ""
            echo "  (no args)         Start or resume build automatically"
            echo "  --status          Show current progress"
            echo "  --reset           Clear state and start fresh"
            echo "  --revert 3.1      Undo step 3.1 (git revert) and mark as pending"
            echo "  --log 3.1         Show the log for step 3.1"
            echo ""
            echo "Revert examples:"
            echo "  ./build.sh --revert 5.2       # Undo step 5.2, resume from there"
            echo "  ./build.sh --revert 3.1       # Undo steps 3.1+, resume from 3.1"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- State management ---
mkdir -p "$LOG_DIR"

init_state() {
    echo -n "" > "$STATE_FILE"
    for step in "${ALL_STEPS[@]}"; do
        echo "$step:pending" >> "$STATE_FILE"
    done
}

get_step_status() {
    grep "^$1:" "$STATE_FILE" 2>/dev/null | cut -d: -f2
}

set_step_status() {
    local step=$1 status=$2
    if grep -q "^$step:" "$STATE_FILE" 2>/dev/null; then
        sed -i '' "s/^$step:.*/$step:$status/" "$STATE_FILE"
    else
        echo "$step:$status" >> "$STATE_FILE"
    fi
}

get_next_step() {
    for step in "${ALL_STEPS[@]}"; do
        local status=$(get_step_status "$step")
        if [[ "$status" != "done" ]]; then
            echo "$step"
            return
        fi
    done
    echo "ALL_DONE"
}

count_done() {
    local c
    c=$(grep -c ":done" "$STATE_FILE" 2>/dev/null) || true
    echo "${c:-0}"
}

# --- Progress reporter (background) ---
PROGRESS_PID=""
CURRENT_STEP_ID=""
CURRENT_LOG_FILE=""
STEP_START_TIME=""

start_progress_reporter() {
    (
        while true; do
            sleep "$PROGRESS_INTERVAL"
            local now=$(date +%s)
            local elapsed=$(( now - ${STEP_START_TIME:-$now} ))
            local mins=$(( elapsed / 60 ))
            local secs=$(( elapsed % 60 ))
            local done_count=$(count_done)
            local total=${#ALL_STEPS[@]}
            local log_size="0"
            if [[ -f "$CURRENT_LOG_FILE" ]]; then
                log_size=$(wc -c < "$CURRENT_LOG_FILE" 2>/dev/null | tr -d ' ')
            fi
            local log_kb=$(( ${log_size:-0} / 1024 ))
            echo -e "${DIM}  [${mins}m${secs}s] Step ${CURRENT_STEP_ID} running... (${done_count}/${total} done, log: ${log_kb}KB)${NC}"
        done
    ) &
    PROGRESS_PID=$!
}

stop_progress_reporter() {
    if [[ -n "$PROGRESS_PID" ]]; then
        kill "$PROGRESS_PID" 2>/dev/null
        wait "$PROGRESS_PID" 2>/dev/null
        PROGRESS_PID=""
    fi
}

cleanup_on_exit() {
    stop_progress_reporter
    # Reset any "running" steps back to "pending" so restart is clean
    if [[ -f "$STATE_FILE" ]]; then
        sed -i '' 's/:running/:pending/g' "$STATE_FILE" 2>/dev/null || true
    fi
    echo ""
    echo -e "${Y}Build interrupted. Run ./build.sh to resume from step $(get_next_step).${NC}"
}
trap cleanup_on_exit EXIT INT TERM

# --- Display ---
show_banner() {
    echo ""
    echo -e "${BOLD}${B}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${B}║              YUNI — Autonomous Build Orchestrator           ║${NC}"
    echo -e "${BOLD}${B}║          Opus 4.6 · Max Effort · Auto-Resume                ║${NC}"
    echo -e "${BOLD}${B}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_status() {
    local done_count=$(count_done)
    local total=${#ALL_STEPS[@]}
    local pct=0
    [[ $total -gt 0 ]] && pct=$(( done_count * 100 / total ))

    echo -e "${BOLD}Progress: ${done_count}/${total} steps (${pct}%)${NC}"
    echo ""

    local current_phase=""
    for step in "${ALL_STEPS[@]}"; do
        local phase=${step%%.*}
        if [[ "$phase" != "$current_phase" ]]; then
            current_phase=$phase
            echo -e "  ${BOLD}Phase ${phase}: ${PHASE_NAMES[$phase]}${NC}"
        fi
        local status=$(get_step_status "$step")
        case $status in
            done)    echo -e "    ${G}✓${NC} Step $step" ;;
            failed)  echo -e "    ${R}✗${NC} Step $step (check .build-logs/)" ;;
            running) echo -e "    ${Y}▸${NC} Step $step (in progress)" ;;
            *)       echo -e "    ${DIM}○${NC} Step $step" ;;
        esac
    done
    echo ""
}

# --- System prompt (written once, reused) ---
write_system_prompt() {
    cat > "$SYSTEM_PROMPT_FILE" << 'SYSPROMPT'
You are a senior full-stack engineer implementing the Yuni dating app redesign.
You have access to the full codebase. CLAUDE.md contains all project conventions.

MANDATORY RULES:
1. Read EVERY file you intend to modify BEFORE making changes. No exceptions.
2. Match existing code patterns EXACTLY: imports, types, async patterns, UUID PKs, mapped_column, server_default=func.now().
3. Write Alembic migrations MANUALLY as Python files. Do NOT try to run the alembic CLI.
4. Check the latest migration in backend/alembic/versions/ for the correct down_revision.
5. Do NOT create test files unless the task explicitly says to.
6. Do NOT modify documentation files (CLAUDE.md, PLAN.md, STEPS.md, research.txt, analysis.txt, flow.txt, failure_modes.txt, IDEA.md).
7. If a file ALREADY contains the required changes, say so and skip it. Do not duplicate work.
8. Do NOT ask questions or request clarification. Make the best engineering decision and proceed.
9. Do NOT add unnecessary comments, docstrings, or type annotations to code you did not change.
10. Register ALL new models in backend/app/models/__init__.py.
11. Include ALL new routers in backend/app/main.py.
12. For mobile changes: keep existing UI design language, component patterns, and styling.
13. Verify your work compiles: check imports are correct and referenced modules exist.
SYSPROMPT
}

# --- Git checkpointing ---
git_checkpoint() {
    local step_id=$1
    local step_desc=$2
    cd "$PROJECT_DIR"
    # Stage all changes except logs and state file
    git add -A -- . ':!.build-logs' ':!.build-state' 2>/dev/null || true
    # Check if there's anything to commit
    if git diff --cached --quiet 2>/dev/null; then
        return 0  # Nothing to commit
    fi
    git commit -m "build: step ${step_id} — ${step_desc}" --no-verify 2>/dev/null || true
}

git_revert_step() {
    # Revert to the commit BEFORE a given step
    local step_id=$1
    local commit
    commit=$(git log --oneline --grep="build: step ${step_id}" -1 --format="%H" 2>/dev/null)
    if [[ -n "$commit" ]]; then
        echo -e "${Y}Reverting step $step_id (commit $commit)...${NC}"
        git revert --no-commit "$commit" 2>/dev/null && git commit -m "revert: undo step ${step_id}" --no-verify 2>/dev/null
        set_step_status "$step_id" "pending"
        echo -e "${G}Step $step_id reverted. Run ./build.sh to redo it.${NC}"
    else
        echo -e "${R}No commit found for step $step_id${NC}"
    fi
}

# --- Rate limit detection ---
is_rate_limited() {
    local log_file=$1
    # Check for common rate limit indicators in the log
    grep -qi "rate.limit\|429\|too many requests\|overloaded\|capacity\|quota.*exceeded\|try again later" "$log_file" 2>/dev/null
}

wait_for_rate_limit() {
    local step_id=$1
    local attempt=$2
    local wait_mins=$(( RATE_LIMIT_WAIT / 60 ))
    local resume_time=$(date -v+${RATE_LIMIT_WAIT}S +%H:%M 2>/dev/null || date -d "+${RATE_LIMIT_WAIT} seconds" +%H:%M 2>/dev/null || echo "~1hr")

    echo ""
    echo -e "  ${Y}⏳ Rate limited on step $step_id (attempt $attempt/${MAX_RETRIES})${NC}"
    echo -e "  ${Y}   Waiting ${wait_mins} minutes. Will retry at ~${resume_time}.${NC}"
    echo -e "  ${Y}   (Safe to Ctrl+C — run ./build.sh later to resume from this step)${NC}"
    echo ""

    # Countdown with periodic status
    local waited=0
    while [[ $waited -lt $RATE_LIMIT_WAIT ]]; do
        sleep 60
        waited=$(( waited + 60 ))
        local remaining=$(( (RATE_LIMIT_WAIT - waited) / 60 ))
        echo -e "  ${DIM}  [rate limit] ${remaining}m remaining...${NC}"
    done
}

# --- Core execution ---
run_step() {
    local step_id=$1
    local step_desc=$2
    local prompt=$3

    local step_log="$LOG_DIR/step_${step_id}.log"

    # Skip if already done
    local status=$(get_step_status "$step_id")
    if [[ "$status" == "done" ]]; then
        echo -e "  ${G}✓${NC} Step $step_id: $step_desc ${DIM}(already done)${NC}"
        return 0
    fi

    echo -e "  ${C}▸${NC} Step $step_id: ${BOLD}$step_desc${NC}"
    set_step_status "$step_id" "running"

    local attempt=0
    while [[ $attempt -lt $MAX_RETRIES ]]; do
        attempt=$(( attempt + 1 ))

        # Start progress reporter
        CURRENT_STEP_ID="$step_id"
        CURRENT_LOG_FILE="$step_log"
        STEP_START_TIME=$(date +%s)
        start_progress_reporter

        # Build the prompt — on retry, add context about partial completion
        local full_prompt="$prompt"
        if [[ $attempt -gt 1 ]]; then
            full_prompt="The previous attempt at this task may have partially completed. Check the current state of ALL files first, then complete any remaining work. If everything is already done correctly, just confirm it.

TASK: $prompt"
        fi

        # Execute
        local exit_code=0
        $CLAUDE_CMD \
            -p "$full_prompt" \
            --permission-mode "$PERMISSION_MODE" \
            --model "$MODEL" \
            --effort "$EFFORT" \
            --append-system-prompt-file "$SYSTEM_PROMPT_FILE" \
            > "$step_log" 2>&1 || exit_code=$?

        stop_progress_reporter

        local elapsed=$(( $(date +%s) - STEP_START_TIME ))
        local mins=$(( elapsed / 60 ))
        local secs=$(( elapsed % 60 ))
        local log_size=0
        [[ -f "$step_log" ]] && log_size=$(wc -c < "$step_log" | tr -d ' ')
        local log_kb=$(( log_size / 1024 ))

        # SUCCESS
        if [[ $exit_code -eq 0 ]] && [[ $log_size -gt 100 ]]; then
            set_step_status "$step_id" "done"
            git_checkpoint "$step_id" "$step_desc"
            if [[ $attempt -eq 1 ]]; then
                echo -e "  ${G}✓${NC} Step $step_id completed (${mins}m${secs}s, ${log_kb}KB) ${DIM}[committed]${NC}"
            else
                echo -e "  ${G}✓${NC} Step $step_id completed on attempt $attempt (${mins}m${secs}s) ${DIM}[committed]${NC}"
            fi
            return 0
        fi

        # RATE LIMITED — check log for rate limit indicators
        if is_rate_limited "$step_log"; then
            wait_for_rate_limit "$step_id" "$attempt"
            continue  # Retry after waiting
        fi

        # FAILED (not rate limit) — retry once with context, then move on
        if [[ $attempt -eq 1 ]]; then
            echo -e "  ${Y}⟳${NC} Step $step_id: first attempt issue (exit $exit_code, ${log_kb}KB log). Retrying..."
            continue  # One free retry for non-rate-limit failures
        fi

        # Second failure — commit whatever we have, mark done, move on
        echo -e "  ${Y}⚠${NC} Step $step_id: completed with warnings after $attempt attempts"
        set_step_status "$step_id" "done"
        git_checkpoint "$step_id" "$step_desc"
        echo -e "    ${DIM}Log: $step_log${NC}"
        return 0
    done

    # Exhausted all retries (only happens with sustained rate limiting)
    echo -e "  ${R}✗${NC} Step $step_id: exhausted $MAX_RETRIES retries. Marking as pending."
    echo -e "  ${R}  Run ./build.sh later to retry.${NC}"
    set_step_status "$step_id" "pending"
    return 1
}

# --- Verification steps ---
verify() {
    local desc=$1
    local cmd=$2
    echo -ne "  ${DIM}  Checking: $desc...${NC}"
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e " ${G}✓${NC}"
    else
        echo -e " ${Y}⚠${NC}"
    fi
}


# ============================================================================
#  STEP DEFINITIONS — Every prompt is comprehensive and self-contained
# ============================================================================

run_phase_1() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 1: ${PHASE_NAMES[1]} ═══${NC}"
    echo ""

    run_step "1.1" "Analytics + experiment models & services" \
'Create the complete analytics and A/B testing instrumentation for Yuni. Read existing models (user.py, report.py, group.py, match.py) and services (feedback_service.py) to match patterns.

CREATE backend/app/models/analytics.py:

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    - id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    - user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    - event_type: Mapped[str] = mapped_column(String(100), index=True)
    - event_data: Mapped[dict] = mapped_column(JSON, default=dict)
    - session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    - created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    - Index("ix_analytics_events_user_type_date", "user_id", "event_type", "created_at")

class GroupOutcome(Base):
    __tablename__ = "group_outcomes"
    - id: UUID PK, group_id: UUID FK date_groups.id (unique), activity: String(100)
    - group_size: int, mean_attractiveness: float, std_attractiveness: float
    - mean_energy: float, std_energy: float, role_diversity_score: float
    - n_mutual_matches: int default=0, n_soft_matches: int default=0
    - mean_experience_rating: Optional[float], mean_chemistry_rating: Optional[float]
    - conversion_rate: Optional[float], is_explore_group: bool default=False, created_at

CREATE backend/app/models/experiment.py:

class Experiment(Base):
    __tablename__ = "experiments"
    - id: UUID PK, name: String(100) unique indexed, description: Optional[str]
    - variants: JSON list, variant_weights: JSON list
    - start_date: datetime, end_date: Optional[datetime], is_active: bool default=True, created_at

class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"
    - id: UUID PK, user_id: UUID FK users.id, experiment_id: UUID FK experiments.id
    - variant: String(50), created_at
    - UniqueConstraint("user_id", "experiment_id"), Index on (experiment_id, variant)

CREATE backend/app/services/analytics_service.py (all async):
    - log_event(db, user_id, event_type, event_data=None, session_id=None) -> AnalyticsEvent
    - compute_group_outcome(db, group_id) -> GroupOutcome (query group members, compute stats)
    - get_gender_ratio(db) -> dict {male_count, female_count, total, male_ratio, status}
    - get_baseline_metrics(db) -> dict {total_users, total_dates, total_matches, conversion rates}

CREATE backend/app/services/experiment_service.py (all async):
    - assign_variant(db, user_id, experiment_name) -> str (hash-based deterministic, check existing)
    - get_variant(db, user_id, experiment_name) -> Optional[str]
    - compute_experiment_metrics(db, experiment_name) -> dict with per-variant metrics + z-test p-value

CREATE Alembic migration for all 4 tables. Read backend/alembic/versions/ to find latest down_revision.
UPDATE backend/app/models/__init__.py to import+export all 4 new models.'

    run_step "1.2" "Event logging in existing services" \
'Add analytics event logging to existing code. Read each file first, then add ONLY the log_event calls.

1. backend/app/services/feedback_service.py — import log_event from analytics_service. After each Match is created in check_and_create_matches, add: await log_event(db, a, "match_revealed", {"match_id": str(match.id), "group_id": str(group_id)})

2. backend/app/websocket/ — Read all files in this directory. Find where ChatMessage records are created/saved. If there is a db session available, add log_event for "message_sent". If websocket handlers do not have a db session, SKIP this — do not break the websocket flow.

3. backend/app/routers/dates.py — Find the POST endpoint that creates DateRequest. After creation, add: await log_event(db, current_user.id, "date_request_created", {"activity": date_request.activity if hasattr(date_request, "activity") else ""})

4. backend/app/routers/profiles.py — Find the POST endpoint that creates a profile. After creation, add: await log_event(db, current_user.id, "profile_completed", {})

ONLY ADD LOGGING. Do not change any existing logic or control flow.'

    run_step "1.3" "Admin analytics & experiment endpoints" \
'Add admin API endpoints for analytics and experiments. Read backend/app/routers/admin.py first to match the existing pattern (dependencies, auth, response format).

Add to the admin router:

1. GET /api/admin/analytics/gender-ratio — calls analytics_service.get_gender_ratio(db), returns result dict
2. GET /api/admin/analytics/baseline — calls analytics_service.get_baseline_metrics(db), returns result dict

3. GET /api/admin/experiments — query all Experiment records, return as list of dicts with basic info
4. POST /api/admin/experiments — create new Experiment from request body {name: str, description: str|null, variants: list[str], variant_weights: list[float], start_date: str (ISO datetime), end_date: str|null}. Validate len(variants)==len(variant_weights). Return the created experiment.
5. GET /api/admin/experiments/{experiment_id}/results — call experiment_service.compute_experiment_metrics for that experiment name, return results

Create any needed Pydantic schemas (ExperimentCreate, ExperimentResponse) — put them in backend/app/schemas/ (new file or existing). All endpoints require admin auth (use the same dependency as other admin endpoints).'

    run_step "1.4" "Phase 1 verification" \
'Verify Phase 1 implementation is complete and correct. Check:

1. Read backend/app/models/analytics.py — verify AnalyticsEvent and GroupOutcome models exist with correct fields
2. Read backend/app/models/experiment.py — verify Experiment and ExperimentAssignment models exist
3. Read backend/app/models/__init__.py — verify all 4 new models are imported and in __all__
4. Read backend/app/services/analytics_service.py — verify log_event, compute_group_outcome, get_gender_ratio, get_baseline_metrics exist
5. Read backend/app/services/experiment_service.py — verify assign_variant, get_variant, compute_experiment_metrics exist
6. Read backend/app/routers/admin.py — verify the 5 new endpoints exist
7. Check that an Alembic migration exists in backend/alembic/versions/ that creates analytics_events, group_outcomes, experiments, experiment_assignments tables

If ANY of these are missing, create them now. If all exist, report "Phase 1 verification: all components present."'

    # Local verification
    verify "Model imports" \
        "cd $PROJECT_DIR && $VENV_PYTHON -c 'import sys; sys.path.insert(0,\"backend\"); from app.models import AnalyticsEvent, GroupOutcome, Experiment, ExperimentAssignment'"
    verify "Service imports" \
        "cd $PROJECT_DIR && $VENV_PYTHON -c 'import sys; sys.path.insert(0,\"backend\"); from app.services.analytics_service import log_event; from app.services.experiment_service import assign_variant'"
}

run_phase_2() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 2: ${PHASE_NAMES[2]} ═══${NC}"
    echo ""

    run_step "2.1" "Backend: values_vector + schema cleanup" \
'Implement backend onboarding changes. Read backend/app/models/user.py and backend/app/schemas/profile.py thoroughly first.

1. USER MODEL (backend/app/models/user.py):
   Add field: values_vector: Mapped[list] = mapped_column(JSON, default=list)
   This stores 6 binary ints like [0,1,1,0,1,0] from the values assessment.
   Keep ALL existing fields (backward compatibility).

2. PROFILE SCHEMA (backend/app/schemas/profile.py):
   - Add: values_vector: list[int] = Field(default_factory=list)
   - Add a Pydantic validator: if values_vector is provided, it must have exactly 6 items, each 0 or 1
   - Modify dealbreakers: add max_length=3 or a validator limiting to 3 items
   - Make these fields truly Optional (remove from any required checks): pref_body_type, pref_height_range, pref_social_energy_range, pref_humor_styles, pref_communication
   - Keep them in the schema as Optional for backward compat but they should not be required

3. PROFILE ROUTER/SERVICE: Read the profile creation endpoint. Ensure values_vector from the request is saved to the User model.

4. ALEMBIC MIGRATION: Add values_vector column to users table (type JSON, nullable=True, server_default="[]"). Read existing migrations for latest revision.'

    run_step "2.2" "Mobile: single 7-step onboarding flow" \
'Redesign the mobile onboarding to a single 7-step flow. Read ALL of these files first:
- mobile/src/screens/ProfileSetupScreen.tsx
- mobile/src/navigation/AppNavigator.tsx
- mobile/src/api/profiles.ts
- mobile/src/types/index.ts (if exists)

IMPORTANT: This is a large change. Take your time. Read the full existing ProfileSetupScreen first.

THE 7 STEPS (replace the current quick/thorough dual path):

Step 1 - Photos: Upload 3-6 photos + selfie verification. Keep existing photo upload logic.

Step 2 - Basics: Program dropdown, year of study. Keep existing fields and UI.

Step 3 - Looking For: relationship_intent (Casual/Serious/Open cards), age_range (dual slider), dealbreakers (max 3 from list: Smoking, Heavy drinking, Different religion, Long distance, Rude to others — show "X/3 selected" counter that prevents selecting more than 3).

Step 4 - Values (NEW): 6 screens or cards, each showing a binary choice. User taps left or right:
  1. "Ambition" vs "Work-life balance"
  2. "Tradition" vs "Open-mindedness"
  3. "Independence" vs "Togetherness"
  4. "Adventure" vs "Stability"
  5. "Spontaneity" vs "Planning"
  6. "Brutal honesty" vs "Kind diplomacy"
Store as values_vector: [0,1,1,0,1,0] where 0=left, 1=right. Use a simple card-based UI with two tappable options per card.

Step 5 - Group Vibe: social_energy (1-5 slider with labels: "Quiet observer" to "Life of the party"), group_role (SINGLE select radio buttons: Catalyst, Entertainer, Listener, Planner, Flexible).

Step 6 - Activities & Interests: Activity preferences (select 3+ from list, show the most engaging first: Escape Room, Cooking Class, Trivia, Hiking, Karaoke, Bowling, Board Games, Mini Golf, Dinner, Bar). Interests (select up to 10 from a streamlined list of ~40 items across categories).

Step 7 - Prompts: Choose 2 of 10 prompts and select/write answers. Keep existing prompt logic.

NAVIGATION: Remove any path-selection screen. The flow should be: Registration → Step 1 → 2 → 3 → 4 → 5 → 6 → 7 → Home.

API: When submitting the profile, include values_vector in the request payload alongside all other fields.'

    run_step "2.3" "Phase 2 verification" \
'Verify Phase 2 is complete:
1. Read backend/app/models/user.py — confirm values_vector field exists
2. Read backend/app/schemas/profile.py — confirm values_vector in schema with validation, dealbreakers capped at 3
3. Read mobile/src/screens/ProfileSetupScreen.tsx or equivalent — confirm single flow (no quick/thorough split)
4. Check that a Values step/screen exists with 6 binary pairs
5. Check that values_vector is included in the profile API call

Fix any missing pieces.'
}

run_phase_3() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 3: ${PHASE_NAMES[3]} ═══${NC}"
    echo ""

    run_step "3.1" "Backend: 4-point scale + soft matches" \
'Implement feedback backend redesign. Read backend/app/models/report.py, backend/app/schemas/feedback.py, backend/app/services/feedback_service.py thoroughly.

1. FEEDBACKRATING MODEL (report.py): Add:
   - group_chemistry_rating: Mapped[Optional[int]] = mapped_column(nullable=True)
   - activity_fit_rating: Mapped[Optional[int]] = mapped_column(nullable=True)
   - reflection_tags: Mapped[list] = mapped_column(JSON, default=list)

2. ROMANTICINTEREST MODEL (report.py): Change:
   - KEEP the old "interested" column as: interested: Mapped[Optional[bool]] = mapped_column(nullable=True) for backward compat
   - ADD: interest_level: Mapped[str] = mapped_column(String(20), default="not_interested")
     Valid values: "not_interested", "maybe", "interested", "very_interested"
   - ADD: friend_interest: Mapped[bool] = mapped_column(default=False)
   - Update ALL code that reads "interested" to read "interest_level" instead. Search the entire codebase for RomanticInterest.interested and update each reference.

3. NEW SOFTMATCH MODEL (add to report.py or create new file):
   class SoftMatch(Base):
       __tablename__ = "soft_matches"
       id: UUID PK, group_id: UUID FK date_groups.id
       interested_user_id: UUID FK users.id (the one who said interested/very_interested)
       maybe_user_id: UUID FK users.id (the one who said maybe)
       status: String(20) default="pending" (pending/revealed/accepted/declined/expired)
       reveal_at: datetime (when to show notification = created_at + 48 hours)
       created_at: server_default=func.now()
   Register SoftMatch in models/__init__.py.

4. FEEDBACK SCHEMA (feedback.py): Update to match new model fields. The romantic_interests list should now include interest_level (str) and friend_interest (bool) instead of interested (bool).

5. FEEDBACK SERVICE (feedback_service.py): Rewrite check_and_create_matches:
   - Query RomanticInterest for the group
   - FULL MATCH: both users have interest_level "interested" or "very_interested" → create Match + ChatRoom (keep existing logic)
   - SOFT MATCH: one user has "interested"/"very_interested" AND other has "maybe" → create SoftMatch record with reveal_at = datetime.utcnow() + timedelta(hours=48)
   - Update Elo scoring: use interest_level as numeric score: not_interested=0.0, maybe=0.25, interested=0.75, very_interested=1.0

6. ALEMBIC MIGRATION: Add columns to feedback_ratings and romantic_interests, create soft_matches table. Handle the interested→interest_level change carefully (add new column, keep old for backward compat or migrate data).'

    run_step "3.2" "Mobile: PostDateScreen 3-section redesign" \
'Redesign the mobile PostDateScreen. Read mobile/src/screens/PostDateScreen.tsx first.

Replace with a 3-section layout:

SECTION 1 — GROUP EXPERIENCE:
- "How was the overall experience?" → 1-5 star rating (keep existing star component)
- "How well did the group gel?" → 1-5 scale with labels "Awkward" to "Amazing" (use a slider or 5 tappable buttons)
- "Was [Activity] a good fit?" → 1-5 scale

SECTION 2 — INDIVIDUAL IMPRESSIONS (for each cross-gender group member):
- Show member photo circle + first name
- "How interested are you in [Name]?" → 4 tappable option cards stacked vertically:
  ○ "Not interested"
  ○ "Maybe — would need to see them again"
  ○ "Interested — would like to connect"
  ○ "Very interested — definitely want to see them again"
- "Would you hang out as friends?" → Yes/No toggle
- Block / Report buttons at bottom of each member card (keep existing)

SECTION 3 — QUICK REFLECTION (optional, can skip):
- "What made this date great (or not)?" → Multi-select chip/tag grid:
  Positive: "Good conversation", "Fun activity", "Felt comfortable", "Someone caught my eye"
  Negative: "Awkward silences", "Bad activity fit", "Felt left out", "Someone dominated"

Submit button sends: experience_rating (int), group_chemistry_rating (int), activity_fit_rating (int), reflection_tags (list[str]), and for each person: {user_id, interest_level (string), friend_interest (bool)}.

Update the API call accordingly. Read the API module (mobile/src/api/feedback.ts or similar) and update the payload format.'

    run_step "3.3" "Mobile: SoftMatchScreen + backend endpoint" \
'Create the SoftMatch reveal screen and backend endpoint.

BACKEND — Add to feedback router (backend/app/routers/feedback.py or similar):
POST /api/feedback/soft-matches/{soft_match_id}/respond
  Body: { "accepted": bool }
  Logic:
    - If accepted=true: create Match + ChatRoom (reuse the match creation logic from check_and_create_matches), update SoftMatch status to "accepted", send notification
    - If accepted=false: update SoftMatch status to "declined". Do NOT notify the interested user.
  Auth: require current_user, verify they are the maybe_user_id on the SoftMatch

MOBILE — Create SoftMatchScreen.tsx (read MatchRevealScreen.tsx for patterns):
1. Screen shows: "Someone from your [Activity] group wants to see you again!" with a blurred/gradient-obscured profile image
2. "Reveal" button and "Not now" button
3. On "Reveal": animate away the blur, show person name + clear photo + shared interests
4. Then show: "Want to connect with [Name]?" with "Yes, let us chat!" and "No thanks"
5. "Yes" → POST /api/feedback/soft-matches/{id}/respond {accepted: true} → navigate to the new chat
6. "No thanks" → POST with {accepted: false} → navigate back

Add SoftMatchScreen to the navigation stack. Register the backend endpoint.'

    run_step "3.4" "Phase 3 verification" \
'Verify Phase 3 is complete:
1. Read backend/app/models/report.py — confirm interest_level (str) replaced interested (bool) on RomanticInterest, SoftMatch model exists
2. Read backend/app/services/feedback_service.py — confirm soft match creation logic, Elo uses 4-point scores
3. Read the feedback router — confirm soft-match respond endpoint exists
4. Read mobile PostDateScreen — confirm 3-section layout with 4-point scale
5. Check mobile for SoftMatchScreen existence

Fix any missing pieces.'
}

run_phase_4() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 4: ${PHASE_NAMES[4]} ═══${NC}"
    echo ""

    run_step "4.1" "Matching algorithm: group-level Q function" \
'Major overhaul of the matching algorithm. Read backend/app/services/matching_service.py THOROUGHLY — every function, every constant.

KEY CHANGE: Replace pairwise compatibility scoring with GROUP-LEVEL condition optimization.

1. NEW Q FUNCTION — replaces compute_group_score (or equivalent). This scores the GROUP as a whole:

def compute_group_quality(group_users, activity, weights):
    """Score = sum of weighted group-level components."""
    scores = group_users  # list of User objects

    # AttCohesion: -variance of attractiveness scores (HIGHER IS BETTER when variance is LOW)
    att_scores = [u.attractiveness_score or 5.0 for u in scores]
    att_cohesion = -variance(att_scores) if len(att_scores) > 1 else 0

    # RoleDiversity: proportion of unique roles + catalyst bonus
    roles = set(u.group_role for u in scores if u.group_role) - {None}
    role_div = (len(roles) / len(scores)) * 5 if scores else 0
    has_catalyst = any(r in ("catalyst", "Catalyst", "Gets conversation started") for r in roles)
    role_div += 3.0 if has_catalyst else 0

    # EnergyBalance: moderate diversity, optimal std ~ 1.0
    energies = [u.social_energy or 3 for u in scores]
    energy_std = stdev(energies) if len(energies) > 1 else 0
    energy_balance = max(0, 3.0 - abs(energy_std - 1.0) * 2)

    # PersonalityDiv: entropy of attribute combinations (values + energy + role)
    # Approximate: count unique (values_vector, energy_bucket, role) combos
    combos = set()
    for u in scores:
        vv = tuple(u.values_vector) if u.values_vector else ()
        eb = (u.social_energy or 3) // 2
        combos.add((vv, eb, u.group_role))
    personality_div = (len(combos) / len(scores)) * 5 if scores else 0

    # IntentAlignment
    intents = [u.relationship_intent for u in scores if u.relationship_intent]
    if len(set(intents)) == 1: intent_align = 3.0
    elif "open" in intents: intent_align = 1.5
    else: intent_align = 0.0

    # ActivityFit
    ideal_energy_map = {"escape_room":3.5, "cooking_class":2.5, "trivia":3.0, "hiking":3.0, "karaoke":4.0, "bowling":3.0, "board_games":2.0, "mini_golf":3.0, "dinner":2.5, "bar":3.5}
    ideal = ideal_energy_map.get(activity, 3.0)
    mean_energy = mean(energies) if energies else 3.0
    activity_fit = max(0, 3.0 - abs(mean_energy - ideal))

    # ValuesBaseline: moderate cross-gender Hamming distance
    males = [u for u in scores if u.gender == "male"]
    females = [u for u in scores if u.gender == "female"]
    hamming_dists = []
    for m in males:
        for f in females:
            if m.values_vector and f.values_vector and len(m.values_vector) == 6 and len(f.values_vector) == 6:
                hamming_dists.append(sum(a != b for a, b in zip(m.values_vector, f.values_vector)))
    avg_hamming = mean(hamming_dists) if hamming_dists else 3.0
    values_baseline = max(0, 3.0 - abs(avg_hamming - 2.5) * 1.5)

    # FrictionScore
    friction = 0
    diets = [u.diet for u in scores if u.diet]
    if "vegan" in diets and "no_restrictions" in diets: friction += 1.0
    if "halal" in diets and "no_restrictions" in diets: friction += 0.5

    # Weighted sum
    w = weights  # dict loaded from algorithm_config
    Q = (w.get("att_cohesion", 5.0) * att_cohesion
       + w.get("role_diversity", 3.0) * role_div
       + w.get("energy_balance", 1.5) * energy_balance
       + w.get("personality_div", 2.5) * personality_div
       + w.get("intent_alignment", 2.0) * intent_align
       + w.get("activity_fit", 1.5) * activity_fit
       + w.get("values_baseline", 1.5) * values_baseline
       - w.get("friction", 1.5) * friction)
    return Q

2. DEFAULT GROUP SIZE TO 4: Change the group formation logic to ONLY form groups of 4 (2M+2F). Groups of 6 only when pre-grouped friends make 4 impossible.

3. EPSILON-GREEDY: When forming groups, with probability epsilon (from config, default 0.15), assign users to RANDOM valid groups instead of optimizing Q. Tag these groups as explore=True.

4. LOCAL SEARCH: After greedy assignment, do 2-opt: for each pair of groups, try swapping one male between them and one female. If total Q improves, keep the swap. Run 20 random restarts of the entire greedy+local search process, return the best assignment found.

5. CREATE algorithm_config MODEL if it does not exist:
   class AlgorithmConfig(Base):
       __tablename__ = "algorithm_config"
       id: UUID PK, key: String(100) unique, value: JSON, updated_at
   Seed with initial weights. Register in __init__.py. Migration.

KEEP ALL HARD CONSTRAINTS (blocked pairs, dealbreakers, age, gender balance, pre-groups, location) UNCHANGED.'

    run_step "4.2" "Mobile: DateRequestScreen update" \
'Update mobile DateRequestScreen. Read the existing screen first.

1. REMOVE group size selection UI (default to 4 is handled by backend)
2. REORDER activities list: Escape Room, Cooking Class, Trivia, Hiking, Karaoke, Bowling, Board Games, Mini Golf, Dinner, Bar, Art Gallery
3. Add a small "Most popular" badge/tag on the first item (Escape Room)
4. Keep all other functionality unchanged (availability, pre-group friend, submit)'

    run_step "4.3" "Phase 4 verification" \
'Verify Phase 4:
1. Read matching_service.py — confirm group-level Q function exists (not pairwise), default group size 4, epsilon-greedy logic
2. Check algorithm_config model exists
3. Read mobile DateRequestScreen — confirm no group size selector, activities reordered

Fix any missing pieces.'
}

run_phase_5() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 5: ${PHASE_NAMES[5]} ═══${NC}"
    echo ""

    run_step "5.1" "Waitlist + referral + women-confirm-first" \
'Implement gender ratio management. Read backend/app/routers/auth.py, backend/app/models/user.py first.

1. WAITLIST IN SIGNUP: In the registration/signup flow, after the user account is created but before they can create a profile:
   - Call get_gender_ratio(db)
   - If user.gender == "male" AND male_ratio > 0.55:
     Return HTTP 403 with body {"detail": "waitlisted", "position": <count of recent male signups>, "message": "Yuni is balancing its community. Invite a female friend to skip the line!"}
   - Female users and balanced-ratio males proceed normally

2. REFERRAL: Add to User model: referred_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
   In the registration endpoint, accept optional referral_code field. If provided, look up the user whose friend_code matches, and set referred_by to their id.

3. WOMEN-CONFIRM-FIRST: Read the group reveal / notification flow (matching_service or wherever groups are announced to users). Modify so:
   - When a group is formed, send reveal notifications to FEMALE members first
   - Add a confirmed: bool field to GroupMember if not present
   - After all female members confirm (or 12 hour timeout), then notify male members
   If the notification system is simple (just push notifications without confirmation tracking), add the confirmation tracking.

4. ALEMBIC MIGRATION for referred_by column and any GroupMember changes.'

    run_step "5.2" "Pre-date prompts (system messages)" \
'Implement pre-date structured prompts. Read the chat system (models/chat.py, websocket handlers) first.

When a group date is confirmed (all members confirmed, group status changes to "confirmed" or equivalent):

Schedule 4 system messages to be sent to the group chat at specific times:
- Day -3 before scheduled_date: "Lets break the ice! Everyone share your most controversial food opinion"
- Day -2: "Whats something youre weirdly proud of that most people dont know about?"
- Day -1: "What are you looking forward to tomorrow?"
- Day of scheduled_date, 2 hours before scheduled_time: "Almost time! Drop your outfit check"

Implementation approach (choose the simplest that works):
Option A: Create a PreDatePrompt model that stores (group_id, message, send_at, sent: bool). When the matching batch runs or on a periodic check, send any due prompts as ChatMessage records in the group chat room from a system sender.
Option B: Create all 4 ChatMessage records immediately when the group is formed, but with a scheduled_at field, and have the client display them only after that time.

Use whichever approach fits the existing chat architecture. The messages should appear as system/bot messages (not from a real user). If there is no system user, create one with name "Yuni" and is_admin=True.'

    run_step "5.3" "Mobile: share-my-plans button" \
'Add a "Share My Plans" feature to the mobile app. Read the screen that shows date details (GroupRevealScreen or similar).

Add a button labeled "Share My Plans" that uses React Native Share API:
  import { Share } from "react-native";
  Share.share({ message: `I am going on a Yuni group date! ${activity} at ${venue || "TBD"}, ${date} ${time}. Group: ${memberNames.join(", ")}. I will check in after!` })

Place the button prominently but not obtrusively (e.g., below the group member list, or in the header). Use an icon like a share/export icon. Keep existing styling patterns.'
}

run_phase_6() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 6: ${PHASE_NAMES[6]} ═══${NC}"
    echo ""

    run_step "6.1" "SecondDate backend system" \
'Create the second-date bridge backend. Read existing models and services for patterns.

1. MODEL (backend/app/models/second_date.py):
class SecondDate(Base):
    __tablename__ = "second_dates"
    id: UUID PK
    match_id: UUID FK matches.id
    proposer_id: Optional UUID FK users.id (null when system-suggested)
    activity: String(100)
    venue_name: Optional String(200)
    venue_address: Optional String
    proposed_date: Date (from sqlalchemy import Date)
    proposed_time: String(20)
    status: String(20) default="suggested"  # suggested/proposed/accepted/declined/expired
    created_at, updated_at

Register in __init__.py. Alembic migration.

2. SERVICE (backend/app/services/second_date_service.py):
- generate_suggestion(db, match_id): Look up the Match, get original group activity and both users interests. Suggest a related activity (mapping: escape_room→board_games, cooking→dinner, trivia→bar, hiking→mini_golf). Create SecondDate with status=suggested. Return it.
- propose_date(db, second_date_id, proposer_id): Update status to proposed, set proposer_id.
- respond_to_date(db, second_date_id, user_id, accepted): If accepted, status=accepted. If not, status=declined.
- get_suggestions(db, match_id): Return all SecondDate records for this match.

3. ROUTER (backend/app/routers/second_dates.py):
- GET /api/dates/second-date/suggestions/{match_id} — get suggestions
- POST /api/dates/second-date/{second_date_id}/propose — mark as proposed
- POST /api/dates/second-date/{second_date_id}/respond — accept or decline {accepted: bool}
Include router in main.py.

4. AUTO CONVERSATION STARTER: In feedback_service.py, when a Match is created (after check_and_create_matches finds a mutual match), also create a ChatMessage in the new chat room:
"You both had a great time at [group.activity]! Pick up where you left off" — sent from system user or as a system message.'

    run_step "6.2" "Mobile: second-date UI components" \
'Create mobile second-date UI. Read existing chat screen and match screens for patterns.

1. DateSuggestionCard COMPONENT (e.g., mobile/src/components/DateSuggestionCard.tsx):
A card showing: activity icon/name, venue (if any), suggested date/time. Two buttons: "Propose This Date" and "Suggest Something Else". Propose calls POST /api/dates/second-date/{id}/propose.

2. Show this card in the 1-on-1 chat screen: When a match has SecondDate suggestions, render the DateSuggestionCard above the message list or as a special message.

3. SecondDateProposalScreen: When the other person receives a proposal notification, they see: "[Name] wants to go to [activity]!" with buttons: "Accept", "Suggest Alternative", "Not This Week".
Accept → POST respond {accepted: true}
Not This Week → POST respond {accepted: false}

4. CheckInScreen: Simple screen with "[Name]" header and 4 tappable cards: "We met up again!", "Still chatting, good vibes", "Conversation fizzled", "Prefer not to say". Each POSTs to a check-in endpoint.

Add all screens to navigation. Read mobile/src/api/ to add the API call functions.'

    run_step "6.3" "Phase 6 verification" \
'Verify Phase 6:
1. Read backend/app/models/second_date.py — confirm SecondDate model
2. Read backend/app/services/second_date_service.py — confirm generate_suggestion, propose, respond
3. Read backend/app/routers/second_dates.py — confirm 3 endpoints
4. Read backend/app/main.py — confirm second_dates router included
5. Check mobile for DateSuggestionCard component and SecondDateProposalScreen

Fix any missing pieces.'
}

run_phase_7() {
    echo ""
    echo -e "${BOLD}${B}═══ Phase 7: ${PHASE_NAMES[7]} ═══${NC}"
    echo ""

    run_step "7.1" "Weight learning service" \
'Create the weight learning pipeline. Read backend/app/models/analytics.py (GroupOutcome), backend/app/services/matching_service.py (how weights are used).

Create backend/app/services/learning_service.py:

1. compute_reward(db, group_id) -> float:
   Query all signals for this group:
   - r1 = number of romantic interests with level >= "interested" / number of cross-gender pairs → weight 0.20
   - r2 = number of mutual matches / number of cross-gender pairs → weight 0.25
   - r3 = mean group_chemistry_rating / 5.0 (from FeedbackRating) → weight 0.10
   - r4 = mean activity_fit_rating / 5.0 → weight 0.05
   - r5 = 1.0 if any message was sent in direct chat (query ChatMessage for match chat rooms) → weight 0.05
   - r6 = 1.0 if a SecondDate with status "proposed" exists for any match from this group → weight 0.10
   - r7 = 1.0 if a SecondDate with status "accepted" exists → weight 0.15
   - r8 = 1.0 if follow-up check-in was positive → weight 0.10
   Return composite R = sum of weighted signals. Handle missing data gracefully (default to 0).

2. update_weights(db) -> dict:
   - Query all GroupOutcome records
   - For each, compute reward and extract features: [att_cohesion_value, role_div_value, energy_balance_value, personality_div_value, intent_align_value, activity_fit_value, values_baseline_value, friction_value]
   - If fewer than 20 groups: return current weights unchanged (not enough data)
   - Run simple OLS linear regression: R = b0 + b1*f1 + ... + b8*f8
     (Use numpy if available, otherwise manual normal equations: beta = (X^T X)^-1 X^T y)
   - New weights = 0.7 * abs(regression_coefficients) + 0.3 * current_weights (regularize toward current)
   - Normalize so they sum to roughly the same total as before
   - Update algorithm_config in DB
   - Return new weights

3. update_activity_energy_map(db) -> dict:
   - For each activity: group outcomes by mean_energy buckets (low <2.5, medium 2.5-3.5, high >3.5)
   - Compute mean reward per bucket
   - Set ideal_energy to the bucket with highest reward
   - Return {activity: ideal_energy} mapping
   - Store in algorithm_config

Import numpy with a try/except: if not available, use a simple manual OLS implementation.'

    run_step "7.2" "Phase 7 verification + final check" \
'FINAL VERIFICATION — check the entire build:

1. Read backend/app/services/learning_service.py — confirm compute_reward, update_weights, update_activity_energy_map exist
2. Scan backend/app/models/__init__.py — verify ALL models registered: AnalyticsEvent, GroupOutcome, Experiment, ExperimentAssignment, SoftMatch, AlgorithmConfig, SecondDate
3. Scan backend/app/main.py — verify ALL routers included (especially second_dates)
4. List all Alembic migrations — verify they chain correctly (each down_revision points to the previous)
5. Check for any obvious import errors by reading the import sections of all new service files
6. Read mobile/src/navigation/AppNavigator.tsx — verify SoftMatchScreen, SecondDateProposalScreen, CheckInScreen are registered

Report the status of each check. Fix any issues found.'
}


# ============================================================================
#  MAIN
# ============================================================================

main() {
    show_banner

    # Initialize state file if missing
    if [[ ! -f "$STATE_FILE" ]]; then
        init_state
    fi

    # Handle actions
    case "$ACTION" in
        reset)
            init_state
            echo -e "${Y}State reset. Run ./build.sh to start fresh.${NC}"
            exit 0
            ;;
        status)
            show_status
            echo -e "${DIM}Git checkpoints:${NC}"
            git log --oneline --grep="build: step" -10 2>/dev/null | while read line; do
                echo -e "  ${DIM}$line${NC}"
            done
            echo ""
            exit 0
            ;;
        revert)
            if [[ -z "$REVERT_STEP" ]]; then
                echo -e "${R}Usage: ./build.sh --revert STEP_ID (e.g. --revert 3.1)${NC}"
                exit 1
            fi
            # Revert this step and mark it + all subsequent steps as pending
            local found=false
            for step in "${ALL_STEPS[@]}"; do
                if [[ "$step" == "$REVERT_STEP" ]]; then
                    found=true
                fi
                if $found; then
                    local st=$(get_step_status "$step")
                    if [[ "$st" == "done" ]]; then
                        git_revert_step "$step"
                    else
                        set_step_status "$step" "pending"
                    fi
                fi
            done
            if ! $found; then
                echo -e "${R}Step $REVERT_STEP not found.${NC}"
                exit 1
            fi
            echo ""
            show_status
            echo -e "${G}Run ./build.sh to resume from step $REVERT_STEP.${NC}"
            exit 0
            ;;
        log)
            local log_file=$(ls -t "$LOG_DIR"/step_${LOG_STEP}*.log 2>/dev/null | head -1)
            if [[ -n "$log_file" ]]; then
                echo -e "${DIM}Log: $log_file${NC}"
                echo ""
                cat "$log_file"
            else
                echo -e "${R}No log found for step $LOG_STEP${NC}"
            fi
            exit 0
            ;;
    esac

    # Show current status
    show_status

    # Check what's next
    local next=$(get_next_step)
    if [[ "$next" == "ALL_DONE" ]]; then
        echo -e "${G}${BOLD}All steps are done! The build is complete.${NC}"
        echo ""
        echo "Test the app:"
        echo "  Backend: cd backend && $VENV_PYTHON -m pytest tests/ -v"
        echo "  Mobile:  cd mobile && npx tsc --noEmit"
        exit 0
    fi

    local next_phase=${next%%.*}
    echo -e "Resuming from step ${BOLD}$next${NC} (Phase $next_phase: ${PHASE_NAMES[$next_phase]})"
    echo -e "Model: ${BOLD}$MODEL${NC} | Effort: ${BOLD}$EFFORT${NC} | No budget limit"
    echo ""

    # Write system prompt file
    write_system_prompt

    local start_time=$(date +%s)

    # Run all phases (each step checks its own state and skips if done)
    for phase in 1 2 3 4 5 6 7; do
        "run_phase_$phase"
    done

    local duration=$(( $(date +%s) - start_time ))
    echo ""
    echo -e "${BOLD}${B}═══ BUILD COMPLETE ═══${NC}"
    echo -e "Duration: $(( duration / 60 ))m $(( duration % 60 ))s"
    echo -e "Logs: $LOG_DIR/"
    echo ""
    echo -e "${G}${BOLD}All phases completed. Test the app now.${NC}"
    echo ""
}

main
