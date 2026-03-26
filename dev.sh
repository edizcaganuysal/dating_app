#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# Yuni Dev Automation Script
#
# Usage:
#   ./dev.sh start       → Start backend + dashboard + metro (everything)
#   ./dev.sh stop        → Kill all dev servers
#   ./dev.sh restart     → Stop then start
#   ./dev.sh build       → Rebuild Android APK and install on phone
#   ./dev.sh deploy      → Commit, push, and trigger Railway deploy
#   ./dev.sh migrate     → Run Alembic migrations on Supabase
#   ./dev.sh test        → Run backend + frontend tests
#   ./dev.sh check       → TypeScript check + Python import check
#   ./dev.sh status      → Show what's running
#   ./dev.sh logs        → Tail backend logs
##############################################################################

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
MOBILE_DIR="$PROJECT_DIR/mobile"
DASHBOARD_DIR="$PROJECT_DIR/dashboard"
VENV_DIR="$PROJECT_DIR/.venv"
JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
ANDROID_HOME="$HOME/Library/Android/sdk"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }

get_ip() {
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost"
}

activate_venv() {
    source "$VENV_DIR/bin/activate"
}

##############################################################################
# Commands
##############################################################################

cmd_start() {
    info "Starting all Yuni dev servers..."

    # Kill existing
    cmd_stop 2>/dev/null || true

    # Backend
    info "Starting backend on :8000..."
    activate_venv
    cd "$BACKEND_DIR"
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/yuni-backend.log 2>&1 &
    echo $! > /tmp/yuni-backend.pid

    # Dashboard
    info "Starting dashboard on :3000..."
    cd "$DASHBOARD_DIR"
    nohup npm run dev -- -p 3000 > /tmp/yuni-dashboard.log 2>&1 &
    echo $! > /tmp/yuni-dashboard.pid

    # Wait for backend
    sleep 3
    for i in {1..10}; do
        if curl -s --max-time 2 http://localhost:8000/api/health > /dev/null 2>&1; then
            log "Backend healthy"
            break
        fi
        sleep 2
    done

    # Wait for dashboard
    sleep 2
    for i in {1..10}; do
        if curl -s --max-time 2 -o /dev/null -w "" http://localhost:3000 > /dev/null 2>&1; then
            log "Dashboard ready"
            break
        fi
        sleep 2
    done

    IP=$(get_ip)
    echo ""
    log "All servers running!"
    echo "  Backend:   http://localhost:8000"
    echo "  Dashboard: http://localhost:3000"
    echo "  Phone API: http://$IP:8000"
    echo ""
    info "Now run in a separate terminal:"
    echo "  cd mobile && npx expo start --dev-client --clear"
    echo ""
    info "Or to build + install on phone:"
    echo "  ./dev.sh build"
}

cmd_stop() {
    info "Stopping all Yuni servers..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    rm -f /tmp/yuni-*.pid
    log "All servers stopped"
}

cmd_restart() {
    cmd_stop
    sleep 1
    cmd_start
}

cmd_build() {
    info "Building Android APK and installing on phone..."

    # Check phone
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
    if ! adb devices 2>/dev/null | grep -q "device$"; then
        err "No Android device connected. Plug in USB and enable USB debugging."
        exit 1
    fi
    log "Phone detected"

    # Prebuild
    cd "$MOBILE_DIR"
    info "Running expo prebuild..."
    npx expo prebuild --platform android --clean 2>&1 | tail -3

    # Build APK
    info "Building APK (this takes a few minutes on first build)..."
    cd "$MOBILE_DIR/android"
    export JAVA_HOME ANDROID_HOME
    export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
    ./gradlew app:assembleDebug -x lint -x test --configure-on-demand --build-cache 2>&1 | grep -E "BUILD|FAILED|error:" || true

    APK="$MOBILE_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
    if [ ! -f "$APK" ]; then
        err "Build failed. Check gradle output above."
        exit 1
    fi
    log "APK built ($(du -h "$APK" | awk '{print $1}'))"

    # Install
    info "Installing on phone..."
    adb install -r "$APK"
    log "Installed!"

    # Launch
    IP=$(get_ip)
    adb shell am force-stop com.yuni.app 2>/dev/null || true
    sleep 1
    adb shell am start -n com.yuni.app/.MainActivity \
        -d "exp+yuni://expo-development-client/?url=http%3A%2F%2F${IP}%3A8081" 2>/dev/null
    log "App launched on phone"

    # Start metro if not running
    if ! lsof -ti:8081 > /dev/null 2>&1; then
        info "Starting Metro bundler..."
        cd "$MOBILE_DIR"
        npx expo start --dev-client --clear &
    fi
}

cmd_deploy() {
    info "Deploying to GitHub (Railway auto-deploys)..."

    cd "$PROJECT_DIR"

    # Check for changes
    if git diff --quiet && git diff --staged --quiet; then
        warn "No changes to commit"
    else
        # Stage all
        git add -A

        # Generate commit message from diff
        CHANGED=$(git diff --cached --stat | tail -1)
        echo ""
        info "Changes: $CHANGED"
        echo ""

        read -p "Commit message (or press Enter for auto): " MSG
        if [ -z "$MSG" ]; then
            MSG="Update: $CHANGED"
        fi

        git commit -m "$MSG"
        log "Committed"
    fi

    git push origin main
    log "Pushed to GitHub → Railway will auto-deploy"
}

cmd_migrate() {
    info "Running Alembic migrations on Supabase..."
    activate_venv
    cd "$BACKEND_DIR"
    alembic upgrade head
    log "Migrations complete"
}

cmd_test() {
    info "Running tests..."

    # Backend
    info "Backend tests..."
    activate_venv
    cd "$BACKEND_DIR"
    python -m pytest tests/ -v --tb=short 2>&1 | tail -20

    # Mobile TypeScript
    info "Mobile TypeScript check..."
    cd "$MOBILE_DIR"
    npx tsc --noEmit
    log "TypeScript clean"

    # Dashboard build check
    info "Dashboard build check..."
    cd "$DASHBOARD_DIR"
    npx tsc --noEmit
    log "Dashboard TypeScript clean"

    echo ""
    log "All tests passed!"
}

cmd_check() {
    info "Quick checks..."

    # TypeScript
    cd "$MOBILE_DIR"
    if npx tsc --noEmit 2>&1 | head -5 | grep -q "error"; then
        err "Mobile TypeScript errors found"
        npx tsc --noEmit 2>&1 | head -20
    else
        log "Mobile TypeScript: clean"
    fi

    cd "$DASHBOARD_DIR"
    if npx tsc --noEmit 2>&1 | head -5 | grep -q "error"; then
        err "Dashboard TypeScript errors found"
    else
        log "Dashboard TypeScript: clean"
    fi

    # Backend import
    activate_venv
    cd "$BACKEND_DIR"
    if python -c "from app.main import app" 2>&1 | grep -q "Error"; then
        err "Backend import failed"
        python -c "from app.main import app" 2>&1
    else
        log "Backend imports: clean"
    fi
}

cmd_status() {
    echo "Yuni Dev Status"
    echo "━━━━━━━━━━━━━━━"

    if curl -s --max-time 2 http://localhost:8000/api/health > /dev/null 2>&1; then
        log "Backend:   running on :8000"
    else
        err "Backend:   not running"
    fi

    if curl -s --max-time 2 -o /dev/null http://localhost:3000 2>/dev/null; then
        log "Dashboard: running on :3000"
    else
        err "Dashboard: not running"
    fi

    if lsof -ti:8081 > /dev/null 2>&1; then
        log "Metro:     running on :8081"
    else
        err "Metro:     not running"
    fi

    export PATH="$ANDROID_HOME/platform-tools:$PATH"
    if adb devices 2>/dev/null | grep -q "device$"; then
        DEVICE=$(adb devices | grep "device$" | awk '{print $1}')
        log "Phone:     connected ($DEVICE)"
    else
        err "Phone:     not connected"
    fi

    IP=$(get_ip)
    echo ""
    echo "Local IP: $IP"
}

cmd_logs() {
    info "Tailing backend logs (Ctrl+C to stop)..."
    tail -f /tmp/yuni-backend.log 2>/dev/null || err "No log file found. Is backend running?"
}

##############################################################################
# Main
##############################################################################

case "${1:-help}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    build)   cmd_build ;;
    deploy)  cmd_deploy ;;
    migrate) cmd_migrate ;;
    test)    cmd_test ;;
    check)   cmd_check ;;
    status)  cmd_status ;;
    logs)    cmd_logs ;;
    *)
        echo "Yuni Dev Script"
        echo ""
        echo "Usage: ./dev.sh <command>"
        echo ""
        echo "Commands:"
        echo "  start     Start backend + dashboard + show metro instructions"
        echo "  stop      Kill all dev servers"
        echo "  restart   Stop then start"
        echo "  build     Build Android APK and install on phone via USB"
        echo "  deploy    Commit, push to GitHub (Railway auto-deploys)"
        echo "  migrate   Run database migrations on Supabase"
        echo "  test      Run all tests (backend + TypeScript checks)"
        echo "  check     Quick TypeScript + import validation"
        echo "  status    Show what's running"
        echo "  logs      Tail backend logs"
        ;;
esac
