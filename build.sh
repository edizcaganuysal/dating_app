#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# LoveGenie Autonomous Build Pipeline
#
# Usage:
#   ./build.sh                    # Run all phases from the beginning
#   ./build.sh --start-from 5     # Resume from phase 5
#   ./build.sh --phase 3          # Run only phase 3
#   ./build.sh --dry-run          # Print phases without executing
##############################################################################

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$PROJECT_DIR/build.log"
PHASES_DIR="$PROJECT_DIR/phases"
VENV_DIR="$PROJECT_DIR/.venv"

# Parse arguments
START_FROM=0
SINGLE_PHASE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --start-from) START_FROM="$2"; shift 2 ;;
        --phase) SINGLE_PHASE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Logging ─────────────────────────────────────────────────────────────────
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

log_section() {
    echo "" | tee -a "$LOG_FILE"
    echo "================================================================" | tee -a "$LOG_FILE"
    log "$1"
    echo "================================================================" | tee -a "$LOG_FILE"
}

# ── Python Virtual Environment ──────────────────────────────────────────────
setup_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        log "Creating Python virtual environment..."
        python3 -m venv "$VENV_DIR"
    fi
    source "$VENV_DIR/bin/activate"
    log "Python venv activated: $(which python3)"
}

# ── Docker Health Check ─────────────────────────────────────────────────────
ensure_postgres() {
    log "Ensuring PostgreSQL is running..."
    docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d postgres 2>&1 | tee -a "$LOG_FILE"

    local retries=0
    while ! docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
          pg_isready -U lovegenie -d lovegenie_dev > /dev/null 2>&1; do
        retries=$((retries + 1))
        if [ $retries -gt 30 ]; then
            log "FATAL: PostgreSQL did not become ready in 60 seconds"
            exit 1
        fi
        sleep 2
    done
    log "PostgreSQL is ready on port 5433."
}

# ── Dependency Installation ─────────────────────────────────────────────────
install_deps() {
    if [ -f "$PROJECT_DIR/backend/requirements.txt" ]; then
        log "Installing Python dependencies..."
        pip install -r "$PROJECT_DIR/backend/requirements.txt" --quiet 2>&1 | tee -a "$LOG_FILE" || true
    fi

    if [ -f "$PROJECT_DIR/mobile/package.json" ]; then
        log "Installing mobile dependencies..."
        (cd "$PROJECT_DIR/mobile" && npm install --silent 2>&1) | tee -a "$LOG_FILE" || true
    fi

    if [ -f "$PROJECT_DIR/dashboard/package.json" ]; then
        log "Installing dashboard dependencies..."
        (cd "$PROJECT_DIR/dashboard" && npm install --silent 2>&1) | tee -a "$LOG_FILE" || true
    fi
}

# ── Git Checkpoint ──────────────────────────────────────────────────────────
checkpoint() {
    local phase_num="$1"
    local commit_msg="$2"
    local tag_name="phase-$(printf '%02d' "$phase_num")-complete"

    cd "$PROJECT_DIR"
    git add -A

    if git diff --cached --quiet 2>/dev/null; then
        log "No changes to commit for phase $phase_num"
        return 0
    fi

    git commit -m "$commit_msg

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>" 2>&1 | tee -a "$LOG_FILE"

    # Delete existing tag if re-running a phase
    git tag -d "$tag_name" 2>/dev/null || true
    git tag "$tag_name"
    log "Checkpoint created: $tag_name"
}

# ── Run Tests ───────────────────────────────────────────────────────────────
run_tests() {
    local phase_num="$1"
    local test_cmd="$2"

    if [ -z "$test_cmd" ]; then
        log "No tests for phase $phase_num (scaffold phase)"
        return 0
    fi

    log "Running tests for phase $phase_num..."

    local test_output
    if test_output=$(cd "$PROJECT_DIR" && eval "$test_cmd" 2>&1); then
        log "Tests PASSED for phase $phase_num"
        echo "$test_output" >> "$LOG_FILE"
        return 0
    else
        log "Tests FAILED for phase $phase_num"
        echo "$test_output" >> "$LOG_FILE"
        # Store for retry prompt
        LAST_TEST_OUTPUT="$test_output"
        return 1
    fi
}

# ── Core: Run One Phase ────────────────────────────────────────────────────
run_phase() {
    local phase_num="$1"
    local phase_name="$2"
    local prompt_file="$3"
    local test_cmd="$4"
    local commit_msg="$5"

    log_section "PHASE $phase_num: $phase_name"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: $prompt_file"
        log "[DRY RUN] Test command: $test_cmd"
        return 0
    fi

    # Update CLAUDE.md with current phase
    sed -i.bak "s/^Building.*$/Building Phase $phase_num: $phase_name. All previous phases are complete and tests pass./" "$PROJECT_DIR/CLAUDE.md"
    rm -f "$PROJECT_DIR/CLAUDE.md.bak"

    # Read the prompt from file
    local build_prompt
    build_prompt=$(cat "$prompt_file")

    # Step 1: Run Claude to build
    log "Invoking Claude Code for phase $phase_num..."
    local claude_exit_code=0
    claude -p "$build_prompt" --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE" || claude_exit_code=$?

    if [ $claude_exit_code -ne 0 ]; then
        log "WARNING: Claude exited with code $claude_exit_code for phase $phase_num"
    fi

    # Re-install deps (Claude may have added new ones)
    install_deps

    # Step 2: Run tests
    LAST_TEST_OUTPUT=""
    if run_tests "$phase_num" "$test_cmd"; then
        checkpoint "$phase_num" "$commit_msg"
        log "Phase $phase_num COMPLETE"
        return 0
    fi

    # Step 3: Retry once with error context
    log "RETRYING phase $phase_num with error context..."
    local retry_prompt="Phase $phase_num ($phase_name) tests are failing. Here is the test output:

---
$LAST_TEST_OUTPUT
---

Fix ONLY the failing issues. Do NOT rewrite everything from scratch. The test command is: $test_cmd

Read CLAUDE.md for project context."

    claude -p "$retry_prompt" --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE" || true

    install_deps

    if run_tests "$phase_num" "$test_cmd"; then
        checkpoint "$phase_num" "$commit_msg"
        log "Phase $phase_num COMPLETE (after retry)"
        return 0
    fi

    # Step 4: Second retry with more aggressive prompt
    log "SECOND RETRY for phase $phase_num..."
    local retry2_prompt="Phase $phase_num ($phase_name) is STILL failing after one fix attempt. Here is the LATEST test output:

---
$LAST_TEST_OUTPUT
---

This is the last attempt. Read the error carefully. Fix the root cause. The test command is: $test_cmd

Read CLAUDE.md for project context. Check that all imports are correct, all dependencies are installed, and all referenced files exist."

    claude -p "$retry2_prompt" --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE" || true

    install_deps

    if run_tests "$phase_num" "$test_cmd"; then
        checkpoint "$phase_num" "$commit_msg"
        log "Phase $phase_num COMPLETE (after second retry)"
        return 0
    fi

    # Step 5: Abort
    log "FATAL: Phase $phase_num failed after 2 retries. Stopping pipeline."
    local prev_phase=$((phase_num - 1))
    if [ $prev_phase -ge 0 ]; then
        log "Last passing checkpoint: phase-$(printf '%02d' $prev_phase)-complete"
        log "To revert: git reset --hard phase-$(printf '%02d' $prev_phase)-complete"
    fi
    log "To resume after fixing: ./build.sh --start-from $phase_num"
    exit 1
}

##############################################################################
# MAIN EXECUTION
##############################################################################

log_section "LoveGenie Autonomous Build Pipeline Started"
log "Project directory: $PROJECT_DIR"
log "Start from phase: $START_FROM"

# Setup
setup_venv
ensure_postgres

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
    log "Loaded .env"
fi

# Discover and run phases
# Phase files are named: phase_00_scaffold.prompt, phase_01_models.prompt, etc.
# Each has a companion .test and .meta file
for prompt_file in "$PHASES_DIR"/phase_*.prompt; do
    [ -f "$prompt_file" ] || continue

    # Extract phase number from filename
    local_basename=$(basename "$prompt_file")
    phase_num=$(echo "$local_basename" | sed 's/phase_\([0-9]*\).*/\1/' | sed 's/^0*//' )
    [ -z "$phase_num" ] && phase_num=0

    # Skip if before start-from
    if [ "$phase_num" -lt "$START_FROM" ]; then
        log "Skipping phase $phase_num (start-from=$START_FROM)"
        continue
    fi

    # If single phase mode, skip non-matching
    if [ -n "$SINGLE_PHASE" ] && [ "$phase_num" != "$SINGLE_PHASE" ]; then
        continue
    fi

    # Read metadata
    local meta_file="${prompt_file%.prompt}.meta"
    if [ -f "$meta_file" ]; then
        source "$meta_file"
    else
        PHASE_NAME="Phase $phase_num"
        TEST_CMD=""
        COMMIT_MSG="phase-$(printf '%02d' "$phase_num"): complete"
    fi

    # Install deps before each phase
    install_deps

    # Run the phase
    run_phase "$phase_num" "$PHASE_NAME" "$prompt_file" "$TEST_CMD" "$COMMIT_MSG"

    # Break if single phase mode
    if [ -n "$SINGLE_PHASE" ]; then
        break
    fi
done

log_section "BUILD COMPLETE — ALL PHASES PASSED"
log "Total phases executed successfully."
log ""
log "To start the backend:  cd backend && uvicorn app.main:app --reload"
log "To start the dashboard: cd dashboard && npm run dev"
log "To start the mobile:   cd mobile && npx expo start"
