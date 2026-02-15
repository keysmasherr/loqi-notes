#!/bin/bash
# Task Runner - Executes implementation tasks with Claude instances
# Maintains context handoff between sessions for sequential task execution
#
# Usage:
#   ./scripts/task-runner.sh --plan <path>                    # Start/continue
#   ./scripts/task-runner.sh --plan <path> --task <id>        # Run single task
#   ./scripts/task-runner.sh --plan <path> --resume <id>      # Resume from task
#   ./scripts/task-runner.sh --plan <path> --list             # List tasks
#   ./scripts/task-runner.sh --plan <path> --status           # Show progress
#   ./scripts/task-runner.sh --plan <path> --init             # Initialize context

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TASK_PARSER="$SCRIPT_DIR/task-parser.sh"
AGENT_FILE="$PROJECT_ROOT/.claude/agents/task-executor.md"

# Directories
CONTEXT_DIR="$PROJECT_ROOT/docs/task-context"
LOGS_DIR="$PROJECT_ROOT/docs/task-logs"
STATE_FILE="$PROJECT_ROOT/.task-runner-state.json"

# Settings
MAX_RETRIES=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Arguments
PLAN_FILE=""
TASK_ID=""
RESUME_FROM=""
MODE="run"  # run, list, status, init, task

# Validation settings
SKIP_VALIDATION=false
REQUIRED_ENV_VARS=("ANTHROPIC_API_KEY")
REQUIRED_BINARIES=("claude" "jq" "curl")
OPTIONAL_ENV_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY")

# Token management settings
CHECK_TOKENS=true
TOKEN_BUFFER=50000  # Required safety buffer in tokens
ESTIMATED_TOKENS_PER_TASK=30000  # Conservative estimate for task execution
USE_COMPACT_CONTEXT=true  # Use file references instead of inline content
MAX_CONTEXT_TASKS=5  # Only include last N tasks in context (0 = unlimited)

# Background mode settings
NON_INTERACTIVE=false
DEFAULT_ON_FAILURE="retry"  # retry, skip, abort

# Dry-run settings
DRY_RUN=false
OUTPUT_FORMAT="default"  # default, json, quiet, verbose

# Progress bar settings
SHOW_PROGRESS=true
TERM_WIDTH=$(tput cols 2>/dev/null || echo 80)

show_help() {
    cat << EOF
${BOLD}Task Runner${NC} - Execute implementation tasks with Claude instances

${BOLD}Usage:${NC}
  $(basename "$0") --plan <path> [options]          Start/continue from last task
  $(basename "$0") --plan <path> --task <id>        Run a single task
  $(basename "$0") --plan <path> --resume <id>      Resume from specific task
  $(basename "$0") --plan <path> --list             List all tasks with status
  $(basename "$0") --plan <path> --status           Show current progress
  $(basename "$0") --plan <path> --init             Initialize context file only
  $(basename "$0") --help                           Show this help

${BOLD}Basic Options:${NC}
  --plan <path>              Path to markdown plan file (required)
  --task <id>                Run specific task (e.g., 1.2)
  --resume <id>              Resume from specific task
  --list                     List all tasks
  --status                   Show progress status
  --init                     Create context file without running tasks

${BOLD}Execution Modes:${NC}
  --dry-run                  Preview tasks without executing (shows plan)
  --background, -b           Run in non-interactive mode (for automation/CI)
  --on-failure <strategy>    Failure handling in background mode
                             Options: retry (default), skip, abort

${BOLD}Validation:${NC}
  --skip-validation          Skip environment and task validation checks

${BOLD}Token Management:${NC}
  --skip-token-check         Skip token availability checks (not recommended)
  --token-buffer <n>         Required token safety buffer (default: 50000)
                             Prevents mid-task token exhaustion
  --full-context             Use full context mode (more tokens, more detail)
  --context-window <n>       Keep only last N tasks in context (default: 5)
                             Set to 0 for unlimited history

${BOLD}Output Control:${NC}
  --output <format>          Set output format: default, json, quiet, verbose
  --quiet                    Minimal output, disable progress bars
  --verbose                  Maximum detail in dry-run mode

${BOLD}Environment Requirements:${NC}
  Required:
    ANTHROPIC_API_KEY        Claude API key
    claude                   Claude Code CLI installed
    jq                       JSON processor
    curl                     HTTP client

  Optional:
    SUPABASE_URL             Supabase project URL
    SUPABASE_ANON_KEY        Supabase anonymous key

${BOLD}Exit Codes:${NC}
  0    Success
  1    Task failure or user abort
  2    Validation or environment error
  3    Invalid arguments

${BOLD}Examples:${NC}
  # Start the implementation plan
  $(basename "$0") --plan docs/loqinotes-rag-implementation-plan.md

  # Dry-run to preview tasks
  $(basename "$0") --plan docs/plan.md --dry-run --verbose

  # Background mode with auto-skip on failure
  $(basename "$0") --plan docs/plan.md --background --on-failure skip

  # Run specific task quietly
  $(basename "$0") --plan docs/plan.md --task 1.2 --quiet

  # Increase token buffer for complex tasks
  $(basename "$0") --plan docs/plan.md --token-buffer 80000

  # Skip token check (use with caution)
  $(basename "$0") --plan docs/plan.md --skip-token-check

  # Token optimization: Compact context mode (default)
  $(basename "$0") --plan docs/plan.md --context-window 5

  # Full context mode for debugging
  $(basename "$0") --plan docs/plan.md --full-context

  # Unlimited context history
  $(basename "$0") --plan docs/plan.md --context-window 0

  # Check progress
  $(basename "$0") --plan docs/plan.md --status

${BOLD}Files Generated:${NC}
  docs/task-context/<plan>-context.md         Accumulated session context
  docs/task-logs/<plan>-task-<id>.md          Individual task logs
  docs/task-logs/validation-failures.log      Validation error log
  .task-runner-state.json                     Execution state tracking

${BOLD}Documentation:${NC}
  See .claude/agents/task-executor.md for agent instructions
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --plan)
            PLAN_FILE="$2"
            shift 2
            ;;
        --task)
            TASK_ID="$2"
            MODE="task"
            shift 2
            ;;
        --resume)
            RESUME_FROM="$2"
            MODE="run"
            shift 2
            ;;
        --list)
            MODE="list"
            shift
            ;;
        --status)
            MODE="status"
            shift
            ;;
        --init)
            MODE="init"
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --background|--non-interactive|-b)
            NON_INTERACTIVE=true
            shift
            ;;
        --on-failure)
            DEFAULT_ON_FAILURE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --quiet)
            OUTPUT_FORMAT="quiet"
            SHOW_PROGRESS=false
            shift
            ;;
        --verbose)
            OUTPUT_FORMAT="verbose"
            shift
            ;;
        --skip-token-check)
            CHECK_TOKENS=false
            shift
            ;;
        --token-buffer)
            TOKEN_BUFFER="$2"
            shift 2
            ;;
        --full-context)
            USE_COMPACT_CONTEXT=false
            shift
            ;;
        --context-window)
            MAX_CONTEXT_TASKS="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}" >&2
            show_help
            exit 1
            ;;
    esac
done

# Validate flag values first (before checking files)
# Validate --on-failure values
if [[ ! "$DEFAULT_ON_FAILURE" =~ ^(retry|skip|abort)$ ]]; then
    echo -e "${RED}Error: --on-failure must be one of: retry, skip, abort${NC}" >&2
    exit 3
fi

# Validate --output values
if [[ ! "$OUTPUT_FORMAT" =~ ^(default|json|quiet|verbose)$ ]]; then
    echo -e "${RED}Error: --output must be one of: default, json, quiet, verbose${NC}" >&2
    exit 3
fi

# Validate required arguments
if [ -z "$PLAN_FILE" ]; then
    echo -e "${RED}Error: --plan argument required${NC}" >&2
    show_help
    exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
    echo -e "${RED}Error: Plan file not found: $PLAN_FILE${NC}" >&2
    exit 1
fi

# Validate flag combinations
if [ "$DRY_RUN" = true ] && [ "$NON_INTERACTIVE" = true ]; then
    echo -e "${YELLOW}Warning: Both --dry-run and --background specified. Dry-run mode takes precedence.${NC}"
fi

# Auto-disable progress bars if output is piped or quiet mode
if [ ! -t 1 ] || [ "$OUTPUT_FORMAT" = "quiet" ]; then
    SHOW_PROGRESS=false
fi

# Derive plan name from file
PLAN_NAME=$(basename "$PLAN_FILE" .md)
CONTEXT_FILE="$CONTEXT_DIR/${PLAN_NAME}-context.md"
LOG_PREFIX="$LOGS_DIR/${PLAN_NAME}"

# Ensure directories exist
mkdir -p "$CONTEXT_DIR" "$LOGS_DIR"

# ============================================================================
# State Management Functions
# ============================================================================

init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        echo '{"version":"1.0","plans":{}}' > "$STATE_FILE"
    fi
}

get_plan_state() {
    local key="$1"
    init_state
    jq -r ".plans[\"$PLAN_NAME\"].$key // empty" "$STATE_FILE"
}

set_plan_state() {
    local key="$1"
    local value="$2"
    init_state
    local tmp=$(mktemp)
    jq ".plans[\"$PLAN_NAME\"].$key = $value" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

add_task_history() {
    local task_id="$1"
    local status="$2"
    local passed="$3"
    local total="$4"
    local attempts="$5"

    init_state
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local entry="{\"taskId\":\"$task_id\",\"status\":\"$status\",\"passed\":$passed,\"total\":$total,\"attempts\":$attempts,\"completedAt\":\"$timestamp\"}"

    local tmp=$(mktemp)
    jq ".plans[\"$PLAN_NAME\"].taskHistory = (.plans[\"$PLAN_NAME\"].taskHistory // []) + [$entry]" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

get_completed_tasks() {
    init_state
    jq -r ".plans[\"$PLAN_NAME\"].taskHistory[]? | select(.status == \"completed\") | .taskId" "$STATE_FILE" 2>/dev/null || true
}

is_task_completed() {
    local task_id="$1"
    get_completed_tasks | grep -q "^${task_id}$"
}

# ============================================================================
# Validation Functions
# ============================================================================

log_validation_failure() {
    local error_type="$1"
    local error_message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local validation_log="$LOGS_DIR/validation-failures.log"

    echo "[$timestamp] $error_type: $error_message" >> "$validation_log"
}

validate_environment() {
    local errors=0

    echo -e "${CYAN}Validating environment...${NC}"

    # Check required environment variables
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}✗ Missing required environment variable: $var${NC}"
            echo -e "  ${YELLOW}Fix: export $var=<your-value>${NC}"
            log_validation_failure "ENV_VAR" "Missing $var"
            errors=$((errors + 1))
        else
            echo -e "${GREEN}✓ Environment variable $var is set${NC}"
        fi
    done

    # Check required binaries
    for binary in "${REQUIRED_BINARIES[@]}"; do
        if ! command -v "$binary" &> /dev/null; then
            echo -e "${RED}✗ Required binary not found: $binary${NC}"
            case "$binary" in
                claude)
                    echo -e "  ${YELLOW}Fix: Install Claude Code from https://claude.com/code${NC}"
                    ;;
                jq)
                    echo -e "  ${YELLOW}Fix: Install jq (brew install jq or apt-get install jq)${NC}"
                    ;;
                curl)
                    echo -e "  ${YELLOW}Fix: Install curl (should be pre-installed on most systems)${NC}"
                    ;;
            esac
            log_validation_failure "BINARY" "Missing $binary"
            errors=$((errors + 1))
        else
            echo -e "${GREEN}✓ Binary available: $binary${NC}"
        fi
    done

    # Check optional environment variables (warnings only)
    for var in "${OPTIONAL_ENV_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${YELLOW}⚠ Optional environment variable not set: $var${NC}"
        else
            echo -e "${GREEN}✓ Optional variable $var is set${NC}"
        fi
    done

    if [ $errors -gt 0 ]; then
        echo -e "\n${RED}Environment validation failed with $errors error(s)${NC}"
        echo -e "${YELLOW}Review the errors above and fix them before continuing${NC}"
        return 2
    fi

    echo -e "${GREEN}✓ Environment validation passed${NC}\n"
    return 0
}

validate_task_requirements() {
    local errors=0

    echo -e "${CYAN}Validating task requirements...${NC}"

    # Check context file
    if [ ! -f "$CONTEXT_FILE" ]; then
        echo -e "${YELLOW}⚠ Context file does not exist (will be created): $CONTEXT_FILE${NC}"
    else
        if [ ! -r "$CONTEXT_FILE" ]; then
            echo -e "${RED}✗ Context file is not readable: $CONTEXT_FILE${NC}"
            log_validation_failure "FILE_ACCESS" "Context file not readable: $CONTEXT_FILE"
            errors=$((errors + 1))
        else
            echo -e "${GREEN}✓ Context file accessible: $CONTEXT_FILE${NC}"
        fi
    fi

    # Check state file
    if [ ! -f "$STATE_FILE" ]; then
        echo -e "${YELLOW}⚠ State file does not exist (will be created): $STATE_FILE${NC}"
    else
        if ! jq empty "$STATE_FILE" 2>/dev/null; then
            echo -e "${RED}✗ State file is not valid JSON: $STATE_FILE${NC}"
            echo -e "  ${YELLOW}Fix: Delete the file to reset state: rm $STATE_FILE${NC}"
            log_validation_failure "FILE_FORMAT" "Invalid JSON in state file"
            errors=$((errors + 1))
        else
            echo -e "${GREEN}✓ State file is valid JSON${NC}"
        fi
    fi

    # Check plan file parseability
    if ! "$TASK_PARSER" --count --plan "$PLAN_FILE" &>/dev/null; then
        echo -e "${RED}✗ Plan file cannot be parsed: $PLAN_FILE${NC}"
        echo -e "  ${YELLOW}Fix: Verify plan file format matches task-executor agent expectations${NC}"
        log_validation_failure "PLAN_PARSE" "Cannot parse plan file"
        errors=$((errors + 1))
    else
        local task_count=$("$TASK_PARSER" --count --plan "$PLAN_FILE")
        echo -e "${GREEN}✓ Plan file parsed successfully ($task_count tasks found)${NC}"
    fi

    # Check agent file
    if [ ! -f "$AGENT_FILE" ]; then
        echo -e "${RED}✗ Agent file not found: $AGENT_FILE${NC}"
        echo -e "  ${YELLOW}Fix: Ensure .claude/agents/task-executor.md exists${NC}"
        log_validation_failure "AGENT_FILE" "Agent file not found"
        errors=$((errors + 1))
    else
        echo -e "${GREEN}✓ Agent file exists: $AGENT_FILE${NC}"
    fi

    if [ $errors -gt 0 ]; then
        echo -e "\n${RED}Task requirements validation failed with $errors error(s)${NC}"
        return 2
    fi

    echo -e "${GREEN}✓ Task requirements validation passed${NC}\n"
    return 0
}

validate_session_summary() {
    local output="$1"

    if ! echo "$output" | grep -q "SESSION-SUMMARY-START"; then
        echo -e "${YELLOW}⚠ Session output missing SESSION-SUMMARY-START marker${NC}"
        return 1
    fi

    if ! echo "$output" | grep -q "SESSION-SUMMARY-END"; then
        echo -e "${YELLOW}⚠ Session output missing SESSION-SUMMARY-END marker${NC}"
        return 1
    fi

    local summary=$(echo "$output" | sed -n '/---SESSION-SUMMARY-START---/,/---SESSION-SUMMARY-END---/p')

    if ! echo "$summary" | grep -q "^OUTCOME:"; then
        echo -e "${YELLOW}⚠ Session summary missing OUTCOME field${NC}"
        return 1
    fi

    if ! echo "$summary" | grep -q "^VALIDATIONS_PASSED:"; then
        echo -e "${YELLOW}⚠ Session summary missing VALIDATIONS_PASSED field${NC}"
        return 1
    fi

    if ! echo "$summary" | grep -q "^VALIDATIONS_TOTAL:"; then
        echo -e "${YELLOW}⚠ Session summary missing VALIDATIONS_TOTAL field${NC}"
        return 1
    fi

    return 0
}

# ============================================================================
# Token Management Functions
# ============================================================================

estimate_prompt_tokens() {
    local text="$1"

    # Rough estimation: ~4 characters per token (conservative)
    # This is approximate - actual tokenization varies
    local char_count=${#text}
    echo $((char_count / 4))
}

estimate_task_tokens() {
    local task_content="$1"
    local context_file="$2"

    # Estimate input tokens
    local task_tokens=$(estimate_prompt_tokens "$task_content")
    local context_tokens=0

    if [ -f "$context_file" ]; then
        if [ "$USE_COMPACT_CONTEXT" = true ]; then
            # Compact mode: Claude reads file via Read tool (counts once)
            # Context file is not included in prompt, only referenced
            # Estimate ~500 tokens for file path references
            context_tokens=500
        else
            # Full mode: Context content is read by Claude
            local context_content=$(cat "$context_file")
            context_tokens=$(estimate_prompt_tokens "$context_content")
        fi
    fi

    # Add base instruction tokens
    if [ "$USE_COMPACT_CONTEXT" = true ]; then
        # Compact mode: Shorter prompts, but Claude reads CLAUDE.md
        # CLAUDE.md is ~3KB = ~750 tokens (read via Read tool)
        local base_tokens=1500  # Reduced from 2000
    else
        local base_tokens=2000
    fi

    # Estimate output tokens (assume task generates ~15k tokens)
    local estimated_output=15000

    # Total estimate
    local total=$((task_tokens + context_tokens + base_tokens + estimated_output))

    echo "$total"
}

get_remaining_tokens() {
    # Try to get token usage from Claude Code
    # This is a placeholder - actual implementation depends on Claude Code API

    # For now, we'll use a heuristic based on the current session file if available
    local session_file="$HOME/.claude/current-session.json"

    if [ -f "$session_file" ] && command -v jq &>/dev/null; then
        # Try to extract token usage (this is speculative - adjust based on actual API)
        local used=$(jq -r '.token_usage.input_tokens // 0' "$session_file" 2>/dev/null || echo "0")
        local limit=200000  # Default context window for Claude
        echo $((limit - used))
    else
        # Return conservative estimate if we can't determine actual usage
        echo 100000
    fi
}

check_token_availability() {
    local estimated_needed="$1"
    local task_id="${2:-unknown}"

    if [ "$CHECK_TOKENS" = false ]; then
        return 0
    fi

    echo -e "${CYAN}Checking token availability...${NC}"

    local remaining=$(get_remaining_tokens)
    local required=$((estimated_needed + TOKEN_BUFFER))

    echo -e "${CYAN}  Estimated tokens needed: ${BOLD}$estimated_needed${NC}"
    echo -e "${CYAN}  Safety buffer required: ${BOLD}$TOKEN_BUFFER${NC}"
    echo -e "${CYAN}  Total required: ${BOLD}$required${NC}"
    echo -e "${CYAN}  Tokens remaining: ${BOLD}$remaining${NC}"

    if [ $remaining -lt $required ]; then
        echo -e "\n${RED}✗ INSUFFICIENT TOKENS${NC}"
        echo -e "${YELLOW}Risk: Task may fail mid-execution due to token exhaustion${NC}"
        echo -e "${YELLOW}This could leave the codebase in an inconsistent state!${NC}\n"

        if [ "$NON_INTERACTIVE" = true ]; then
            echo -e "${RED}Non-interactive mode: Aborting to prevent partial completion${NC}"
            log_validation_failure "TOKEN_CHECK" "Insufficient tokens for task $task_id"
            exit 2
        else
            echo -e "${YELLOW}Options:${NC}"
            echo "  [c] Continue anyway (risky - may fail mid-task)"
            echo "  [s] Skip this task"
            echo "  [a] Abort runner"
            echo ""
            read -p "Choice [c/s/a]: " choice

            case $choice in
                c|C)
                    echo -e "${YELLOW}⚠ Continuing with insufficient tokens - monitor closely${NC}"
                    return 0
                    ;;
                s|S)
                    echo -e "${YELLOW}Skipping task due to token concerns${NC}"
                    return 1
                    ;;
                a|A|*)
                    echo -e "${RED}Aborted to prevent partial completion${NC}"
                    exit 2
                    ;;
            esac
        fi
    else
        local buffer_percent=$((TOKEN_BUFFER * 100 / required))
        echo -e "${GREEN}✓ Sufficient tokens available (${buffer_percent}% safety buffer)${NC}\n"
        return 0
    fi
}

# ============================================================================
# Context File Functions
# ============================================================================

init_context_file() {
    if [ ! -f "$CONTEXT_FILE" ]; then
        cat > "$CONTEXT_FILE" << EOF
# ${PLAN_NAME} - Implementation Context

> This file accumulates decisions, implementation notes, and context
> across Claude sessions. Each session appends its summary before closing.

---

## Project State

- **Plan**: $PLAN_NAME
- **Started**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Last Updated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

---

## Architecture Decisions

*No decisions recorded yet.*

---

## Implementation Notes

*No implementation notes yet.*

---

## Session Logs

EOF
        echo -e "${GREEN}Created context file: $CONTEXT_FILE${NC}"
    fi
}

append_session_to_context() {
    local task_id="$1"
    local task_title="$2"
    local outcome="$3"
    local passed="$4"
    local total="$5"
    local summary="$6"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    if [ "$USE_COMPACT_CONTEXT" = true ]; then
        # Compact mode: Extract only key decisions, skip verbose logs
        local key_decisions=$(echo "$summary" | sed -n '/KEY_DECISIONS:/,/BLOCKERS:/p' | grep -v "BLOCKERS:" | tail -n +2)
        local blockers=$(echo "$summary" | sed -n '/BLOCKERS:/,/FILES_MODIFIED:/p' | grep -v "FILES_MODIFIED:" | tail -n +2)
        local files=$(echo "$summary" | sed -n '/FILES_MODIFIED:/,/---SESSION-SUMMARY-END---/p' | grep -v "---SESSION-SUMMARY-END---" | tail -n +2)

        cat >> "$CONTEXT_FILE" << EOF

### Task $task_id: $task_title ($timestamp)
**Outcome**: $outcome ($passed/$total validations)

**Key Decisions**:
$key_decisions

**Blockers**: ${blockers:-None}

**Files Modified**: ${files:-None}

---
EOF
    else
        # Full mode: Include complete session summary
        cat >> "$CONTEXT_FILE" << EOF

### Session: $timestamp
- **Task**: $task_id - $task_title
- **Outcome**: $outcome ($passed/$total validations passed)

$summary

---
EOF
    fi

    # Update last updated timestamp
    sed -i.bak "s/\*\*Last Updated\*\*: .*/\*\*Last Updated\*\*: $timestamp/" "$CONTEXT_FILE" && rm -f "${CONTEXT_FILE}.bak"

    # Apply context windowing if enabled
    if [ "$USE_COMPACT_CONTEXT" = true ] && [ "$MAX_CONTEXT_TASKS" -gt 0 ]; then
        trim_context_window "$CONTEXT_FILE" "$MAX_CONTEXT_TASKS"
    fi
}

trim_context_window() {
    local context_file="$1"
    local max_tasks="$2"

    # Count task entries
    local task_count=$(grep -c "^### Task [0-9]" "$context_file" 2>/dev/null || echo "0")

    if [ "$task_count" -gt "$max_tasks" ]; then
        echo -e "${YELLOW}Context file has $task_count tasks, trimming to last $max_tasks...${NC}"

        # Create a backup
        cp "$context_file" "${context_file}.full-backup-$(date +%Y%m%d-%H%M%S)"

        # Extract header and last N tasks
        local tmp_file=$(mktemp)

        # Get everything up to first task
        sed -n '1,/^### Task [0-9]/p' "$context_file" | head -n -1 > "$tmp_file"

        # Add note about trimming
        cat >> "$tmp_file" << EOF

> **Note**: Older task logs have been archived to reduce context size.
> Full history available in: ${context_file}.full-backup-*

---

EOF

        # Get last N tasks
        grep -A 20 "^### Task [0-9]" "$context_file" | tail -n $(( max_tasks * 21 )) >> "$tmp_file"

        # Replace original
        mv "$tmp_file" "$context_file"

        echo -e "${GREEN}Context trimmed successfully. Backup saved.${NC}"
    fi
}

# ============================================================================
# Progress Bar Functions
# ============================================================================

draw_progress_bar() {
    if [ "$SHOW_PROGRESS" = false ]; then
        return
    fi

    local current="$1"
    local total="$2"
    local label="${3:-Progress}"
    local bar_width=$((TERM_WIDTH - 30))

    if [ $bar_width -lt 10 ]; then
        bar_width=10
    fi

    local percentage=$((current * 100 / total))
    local filled=$((current * bar_width / total))
    local empty=$((bar_width - filled))

    # Build progress bar
    local bar="["
    for ((i=0; i<filled; i++)); do
        bar+="="
    done
    for ((i=0; i<empty; i++)); do
        bar+=" "
    done
    bar+="]"

    printf "\r${CYAN}%s: %s %3d%% (%d/%d)${NC}" "$label" "$bar" "$percentage" "$current" "$total"
}

show_spinner() {
    if [ "$SHOW_PROGRESS" = false ]; then
        return
    fi

    local pid=$1
    local label="${2:-Processing}"
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0

    while kill -0 $pid 2>/dev/null; do
        local temp=${spinstr:$i:1}
        printf "\r${CYAN}%s %s${NC}" "$temp" "$label"
        i=$(( (i+1) % 10 ))
        sleep 0.1
    done
    printf "\r${GREEN}✓ %s${NC}\n" "$label"
}

clear_progress_line() {
    if [ "$SHOW_PROGRESS" = false ]; then
        return
    fi

    printf "\r%${TERM_WIDTH}s\r" ""
}

show_validation_progress() {
    if [ "$SHOW_PROGRESS" = false ]; then
        return
    fi

    local passed="$1"
    local total="$2"
    local task_id="$3"

    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Validation Results for Task $task_id:${NC}"
    draw_progress_bar "$passed" "$total" "Validations"
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# Background Mode Functions
# ============================================================================

handle_task_failure_noninteractive() {
    local task_id="$1"
    local attempt="$2"
    local passed="$3"
    local total="$4"

    echo -e "${YELLOW}[Background Mode] Task $task_id failed ($passed/$total validations passed)${NC}"
    echo -e "${CYAN}Using strategy: $DEFAULT_ON_FAILURE${NC}"

    case "$DEFAULT_ON_FAILURE" in
        retry)
            if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                echo -e "${YELLOW}Retrying task $task_id (attempt $((attempt+1))/$MAX_RETRIES)${NC}"
                return 0  # Signal retry
            else
                echo -e "${RED}Max retries reached for task $task_id. Aborting.${NC}"
                return 1  # Signal abort
            fi
            ;;
        skip)
            echo -e "${YELLOW}Skipping task $task_id${NC}"
            add_task_history "$task_id" "skipped" "$passed" "$total" "$attempt"
            return 2  # Signal skip
            ;;
        abort)
            echo -e "${RED}Aborting task runner${NC}"
            return 1  # Signal abort
            ;;
    esac
}

# ============================================================================
# Dry-Run Mode Functions
# ============================================================================

build_task_prompt() {
    local task_id="$1"
    local task_content="$2"

    if [ "$USE_COMPACT_CONTEXT" = true ]; then
        # Compact mode: Use file references to minimize token usage
        cat << EOF
You are executing Task $task_id from an implementation plan.

## IMPORTANT: File References (Read These First)
1. **Project Instructions**: $PROJECT_ROOT/CLAUDE.md
   - Contains complete codebase overview, tech stack, and coding guidelines
   - Read this to understand the project structure and patterns

2. **Task Context**: $CONTEXT_FILE
   - Contains decisions and summaries from previous tasks
   - Read this to understand what's already been implemented

3. **Agent Instructions**: $AGENT_FILE
   - Contains the session summary format you must follow

## Task to Execute
$task_content

## Instructions
1. Read ALL three files above first (use Read tool)
2. Implement this task following project patterns from CLAUDE.md
3. Consider prior work from context file
4. Validate EVERY checklist item in the task
5. Output session summary in the format specified in agent instructions

CRITICAL: Output the ---SESSION-SUMMARY-START--- block at the end.
EOF
    else
        # Full mode: Original verbose prompt (uses more tokens)
        echo "You are executing Task $task_id from an implementation plan.

## Context File
Read this file first for prior decisions: $CONTEXT_FILE

## Task to Execute
$task_content

## Instructions
1. Read the context file to understand prior work
2. Implement this task following project patterns
3. Validate EVERY checklist item
4. Output your session summary in the exact format specified in your agent instructions

Remember: Output the ---SESSION-SUMMARY-START--- block at the end of your response."
    fi
}

show_dry_run_plan() {
    echo -e "\n${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}DRY-RUN MODE - Task Execution Plan${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"

    echo -e "${CYAN}Plan file:${NC} $PLAN_FILE"
    echo -e "${CYAN}Context file:${NC} $CONTEXT_FILE"
    echo -e "${CYAN}Output format:${NC} $OUTPUT_FORMAT\n"

    local all_tasks=$(get_all_task_ids)
    local task_count=$(echo "$all_tasks" | wc -w | tr -d ' ')
    local completed=$(get_completed_tasks)
    local pending_count=0

    echo -e "${BOLD}Tasks to be executed:${NC}\n"

    for task_id in $all_tasks; do
        if echo "$completed" | grep -q "^${task_id}$"; then
            continue
        fi

        pending_count=$((pending_count + 1))
        local task_json=$("$TASK_PARSER" --task "$task_id" --plan "$PLAN_FILE" --json)
        local task_title=$(echo "$task_json" | jq -r '.title')
        local task_content=$(echo "$task_json" | jq -r '.content')
        local validation_count=$(echo "$task_json" | jq -r '.validationCount')

        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BOLD}Task $task_id:${NC} $task_title"
        echo -e "${CYAN}Validations:${NC} $validation_count items"

        if [ "$OUTPUT_FORMAT" = "verbose" ]; then
            echo -e "\n${YELLOW}Task Content:${NC}"
            echo "$task_content" | head -10
            if [ $(echo "$task_content" | wc -l) -gt 10 ]; then
                echo -e "${YELLOW}... (truncated)${NC}"
            fi

            echo -e "\n${YELLOW}Prompt Preview:${NC}"
            local prompt=$(build_task_prompt "$task_id" "$task_content")
            echo "$prompt" | head -15
            if [ $(echo "$prompt" | wc -l) -gt 15 ]; then
                echo -e "${YELLOW}... (truncated)${NC}"
            fi
        fi
        echo ""
    done

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Summary:${NC} $pending_count task(s) would be executed"
    echo -e "${YELLOW}Note: This is a dry-run. No tasks will be executed.${NC}\n"
}

# ============================================================================
# Task Execution Functions
# ============================================================================

get_all_task_ids() {
    "$TASK_PARSER" --list --plan "$PLAN_FILE" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' || true
}

get_next_task() {
    local completed=$(get_completed_tasks)
    local all_tasks=$(get_all_task_ids)

    for task in $all_tasks; do
        if ! echo "$completed" | grep -q "^${task}$"; then
            echo "$task"
            return
        fi
    done
}

run_single_task() {
    local task_id="$1"
    local attempt="${2:-1}"

    # Run validation if not skipped
    if [ "$SKIP_VALIDATION" = false ]; then
        if ! validate_task_requirements; then
            exit 2
        fi
    fi

    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}TASK $task_id${NC} (Attempt $attempt/$MAX_RETRIES)"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    # Get task content
    local task_json=$("$TASK_PARSER" --task "$task_id" --plan "$PLAN_FILE" --json)
    local task_title=$(echo "$task_json" | jq -r '.title')
    local task_content=$(echo "$task_json" | jq -r '.content')
    local validation_count=$(echo "$task_json" | jq -r '.validationCount')

    echo -e "${CYAN}Task: $task_title${NC}"
    echo -e "${CYAN}Validations: $validation_count items${NC}\n"

    # Prepare log file
    local log_file="${LOG_PREFIX}-task-${task_id}.md"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build the prompt using the new function
    local prompt=$(build_task_prompt "$task_id" "$task_content")

    # Check token availability before execution
    local estimated_tokens=$(estimate_task_tokens "$task_content" "$CONTEXT_FILE")
    if ! check_token_availability "$estimated_tokens" "$task_id"; then
        # Token check failed and user chose to skip
        add_task_history "$task_id" "skipped" "0" "$validation_count" "$attempt"
        return 0
    fi

    echo -e "${YELLOW}Launching Claude session...${NC}\n"

    # Execute Claude
    local output
    if output=$(claude -p "$prompt" --print 2>&1); then
        echo "$output"

        # Save full output to log
        cat > "$log_file" << EOF
# Task $task_id: $task_title
**Executed**: $timestamp
**Attempt**: $attempt

---

$output
EOF

        # Validate and parse session summary
        if validate_session_summary "$output"; then
            local summary=$(echo "$output" | sed -n '/---SESSION-SUMMARY-START---/,/---SESSION-SUMMARY-END---/p')
            local outcome=$(echo "$summary" | grep "^OUTCOME:" | cut -d: -f2 | tr -d ' ')
            local passed=$(echo "$summary" | grep "^VALIDATIONS_PASSED:" | cut -d: -f2 | tr -d ' ')
            local total=$(echo "$summary" | grep "^VALIDATIONS_TOTAL:" | cut -d: -f2 | tr -d ' ')

            # Default values if parsing fails
            passed=${passed:-0}
            total=${total:-$validation_count}
            outcome=${outcome:-UNKNOWN}

            # Show validation progress
            show_validation_progress "$passed" "$total" "$task_id"

            if [ "$outcome" = "PASSED" ]; then
                echo -e "${GREEN}✓ Task $task_id: PASSED ($passed/$total validations)${NC}"

                # Update state
                add_task_history "$task_id" "completed" "$passed" "$total" "$attempt"
                set_plan_state "currentTask" "\"$(get_next_task)\""
                set_plan_state "lastRun" "\"$timestamp\""

                # Append to context
                append_session_to_context "$task_id" "$task_title" "PASSED" "$passed" "$total" "$summary"

                # Verify context file update
                if [ ! -f "$CONTEXT_FILE" ]; then
                    echo -e "${YELLOW}⚠ Warning: Context file was not updated${NC}"
                    log_validation_failure "CONTEXT_UPDATE" "Context file missing after append"
                fi

                return 0
            else
                echo -e "${RED}✗ Task $task_id: FAILED ($passed/$total validations)${NC}"

                if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                    if [ "$NON_INTERACTIVE" = true ]; then
                        # Handle failure in non-interactive mode
                        handle_task_failure_noninteractive "$task_id" "$attempt" "$passed" "$total"
                        local result=$?
                        case $result in
                            0)  # Retry
                                run_single_task "$task_id" $((attempt+1))
                                return $?
                                ;;
                            2)  # Skip
                                return 0
                                ;;
                            *)  # Abort
                                exit 1
                                ;;
                        esac
                    else
                        # Interactive mode
                        echo -e "\n${YELLOW}Options:${NC}"
                        echo "  [r] Retry task (attempt $((attempt+1))/$MAX_RETRIES)"
                        echo "  [s] Skip and continue"
                        echo "  [a] Abort runner"
                        echo ""
                        read -p "Choice [r/s/a]: " choice

                        case $choice in
                            r|R)
                                run_single_task "$task_id" $((attempt+1))
                                return $?
                                ;;
                            s|S)
                                add_task_history "$task_id" "skipped" "$passed" "$total" "$attempt"
                                echo -e "${YELLOW}Skipped task $task_id${NC}"
                                return 0
                                ;;
                            a|A)
                                echo -e "${RED}Aborted${NC}"
                                exit 1
                                ;;
                            *)
                                echo -e "${RED}Invalid choice. Aborting.${NC}"
                                exit 1
                                ;;
                        esac
                    fi
                else
                    echo -e "${RED}Max retries reached for task $task_id${NC}"
                    add_task_history "$task_id" "failed" "$passed" "$total" "$attempt"
                    return 1
                fi
            fi
        else
            echo -e "${YELLOW}Warning: Session summary validation failed${NC}"
            echo -e "Log saved to: $log_file"
            log_validation_failure "SESSION_SUMMARY" "Invalid session summary format"

            if [ "$NON_INTERACTIVE" = true ]; then
                echo -e "${RED}Non-interactive mode: Cannot proceed without valid session summary${NC}"
                add_task_history "$task_id" "failed" "0" "0" "$attempt"
                exit 1
            else
                # Interactive mode
                echo -e "\n${YELLOW}Options:${NC}"
                echo "  [p] Mark as passed"
                echo "  [r] Retry task"
                echo "  [s] Skip and continue"
                echo "  [a] Abort runner"
                echo ""
                read -p "Choice [p/r/s/a]: " choice

                case $choice in
                    p|P)
                        add_task_history "$task_id" "completed" "0" "0" "$attempt"
                        return 0
                        ;;
                    r|R)
                        if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                            run_single_task "$task_id" $((attempt+1))
                            return $?
                        else
                            echo -e "${RED}Max retries reached${NC}"
                            return 1
                        fi
                        ;;
                    s|S)
                        add_task_history "$task_id" "skipped" "0" "0" "$attempt"
                        return 0
                        ;;
                    a|A)
                        exit 1
                        ;;
                    *)
                        exit 1
                        ;;
                esac
            fi
        fi
    else
        echo -e "${RED}Claude execution failed${NC}"
        echo "$output"
        return 1
    fi
}

# ============================================================================
# Main Modes
# ============================================================================

mode_list() {
    echo -e "\n${BOLD}Tasks in: $(basename "$PLAN_FILE")${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local completed=$(get_completed_tasks)
    local total=0
    local done=0

    # Parse task list - use task-parser directly and extract task info
    local all_tasks=$(get_all_task_ids)

    for task_id in $all_tasks; do
        total=$((total + 1))
        # Get task title from parser
        local task_title=$("$TASK_PARSER" --task "$task_id" --plan "$PLAN_FILE" --json 2>/dev/null | jq -r '.title // "Unknown"')

        if echo "$completed" | grep -q "^${task_id}$"; then
            echo -e "  ${GREEN}✓${NC} ${task_id}  ${task_title}"
            done=$((done + 1))
        else
            echo -e "  ${YELLOW}○${NC} ${task_id}  ${task_title}"
        fi
    done

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Progress: ${GREEN}$done${NC}/${CYAN}$total${NC} tasks completed"
}

mode_status() {
    echo -e "\n${BOLD}Status: $PLAN_NAME${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local last_run=$(get_plan_state "lastRun")
    local current=$(get_plan_state "currentTask")
    local completed=$(get_completed_tasks | wc -l | tr -d ' ')
    local total=$("$TASK_PARSER" --count --plan "$PLAN_FILE")

    if [ -z "$last_run" ]; then
        echo -e "  ${YELLOW}No tasks completed yet${NC}"
        echo -e "  Next task: ${CYAN}$(get_next_task)${NC}"
    else
        echo -e "  Last run: ${CYAN}$last_run${NC}"
        echo -e "  Completed: ${GREEN}$completed${NC}/${CYAN}$total${NC} tasks"
        echo -e "  Next task: ${CYAN}$(get_next_task)${NC}"
    fi

    echo -e "\n  Context file: $CONTEXT_FILE"
    echo -e "  State file: $STATE_FILE"
}

mode_init() {
    init_state
    init_context_file
    echo -e "${GREEN}Initialized task runner for: $PLAN_NAME${NC}"
    echo -e "  Context: $CONTEXT_FILE"
    echo -e "  State: $STATE_FILE"
}

mode_run() {
    init_state
    init_context_file

    # Run validations if not skipped
    if [ "$SKIP_VALIDATION" = false ]; then
        if ! validate_environment; then
            exit 2
        fi
        if ! validate_task_requirements; then
            exit 2
        fi
    fi

    # Handle dry-run mode
    if [ "$DRY_RUN" = true ]; then
        show_dry_run_plan
        exit 0
    fi

    echo -e "\n${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Task Runner - $PLAN_NAME${NC}"
    if [ "$NON_INTERACTIVE" = true ]; then
        echo -e "${BOLD}[Background Mode: $DEFAULT_ON_FAILURE]${NC}"
    fi
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"

    local start_task
    if [ -n "$RESUME_FROM" ]; then
        start_task="$RESUME_FROM"
        echo -e "Resuming from task: ${CYAN}$start_task${NC}"
    else
        start_task=$(get_next_task)
        if [ -z "$start_task" ]; then
            echo -e "${GREEN}All tasks completed!${NC}"
            exit 0
        fi
        echo -e "Starting from task: ${CYAN}$start_task${NC}"
    fi

    echo -e "Context file: $CONTEXT_FILE\n"

    # Get all tasks and calculate progress
    local all_tasks=$(get_all_task_ids)
    local total_tasks=$(echo "$all_tasks" | wc -w | tr -d ' ')
    local current_index=0
    local tasks_to_run=0

    # Count tasks to run
    local started=false
    for task in $all_tasks; do
        if [ "$task" = "$start_task" ]; then
            started=true
        fi
        if $started && ! is_task_completed "$task"; then
            tasks_to_run=$((tasks_to_run + 1))
        fi
    done

    # Run tasks
    started=false
    local completed_in_run=0
    for task in $all_tasks; do
        if [ "$task" = "$start_task" ]; then
            started=true
        fi

        if $started; then
            if is_task_completed "$task"; then
                echo -e "${GREEN}✓ Task $task already completed, skipping${NC}"
                continue
            fi

            current_index=$((current_index + 1))

            # Show overall progress
            if [ "$SHOW_PROGRESS" = true ] && [ $tasks_to_run -gt 1 ]; then
                echo -e "\n${CYAN}Overall Progress:${NC}"
                draw_progress_bar "$completed_in_run" "$tasks_to_run" "Tasks"
                echo -e "\n"
            fi

            if ! run_single_task "$task"; then
                echo -e "\n${RED}Task $task failed. Stopping runner.${NC}"
                exit 1
            fi

            completed_in_run=$((completed_in_run + 1))
        fi
    done

    # Final progress
    if [ "$SHOW_PROGRESS" = true ] && [ $tasks_to_run -gt 1 ]; then
        echo -e "\n${CYAN}Overall Progress:${NC}"
        draw_progress_bar "$tasks_to_run" "$tasks_to_run" "Tasks"
        echo -e "\n"
    fi

    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}All tasks completed!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
}

mode_single_task() {
    init_state
    init_context_file

    # Run validations if not skipped
    if [ "$SKIP_VALIDATION" = false ]; then
        if ! validate_environment; then
            exit 2
        fi
        if ! validate_task_requirements; then
            exit 2
        fi
    fi

    # Handle dry-run mode
    if [ "$DRY_RUN" = true ]; then
        show_dry_run_plan
        exit 0
    fi

    if is_task_completed "$TASK_ID"; then
        echo -e "${YELLOW}Task $TASK_ID is already completed.${NC}"
        if [ "$NON_INTERACTIVE" = true ]; then
            echo -e "${YELLOW}[Background Mode] Skipping already completed task${NC}"
            exit 0
        fi
        read -p "Run again? [y/N]: " choice
        if [[ ! "$choice" =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi

    run_single_task "$TASK_ID"
}

# ============================================================================
# Main Entry Point
# ============================================================================

case $MODE in
    list)
        mode_list
        ;;
    status)
        mode_status
        ;;
    init)
        mode_init
        ;;
    task)
        mode_single_task
        ;;
    run)
        mode_run
        ;;
esac
