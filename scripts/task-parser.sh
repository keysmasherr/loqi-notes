#!/bin/bash
# Task Parser - Extracts tasks from markdown implementation plans
# Usage:
#   ./scripts/task-parser.sh --list --plan <path>           # List all tasks
#   ./scripts/task-parser.sh --task <id> --plan <path>      # Get specific task
#   ./scripts/task-parser.sh --count --plan <path>          # Count tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TASK_ID=""
PLAN_FILE=""
MODE="task"  # task, list, count

show_help() {
    cat << EOF
Task Parser - Extract tasks from markdown implementation plans

Usage:
  $(basename "$0") --list --plan <path>           List all tasks
  $(basename "$0") --task <id> --plan <path>      Get specific task content
  $(basename "$0") --count --plan <path>          Count total tasks
  $(basename "$0") --help                         Show this help

Options:
  --plan <path>    Path to the markdown plan file (required)
  --task <id>      Task ID to extract (e.g., 1.2, 2.1)
  --list           List all task IDs and titles
  --count          Output just the count of tasks
  --json           Output in JSON format (for --task mode)

Examples:
  $(basename "$0") --list --plan docs/my-plan.md
  $(basename "$0") --task 1.2 --plan docs/loqinotes-rag-implementation-plan.md
  $(basename "$0") --task 1.2 --plan docs/my-plan.md --json

Plan File Format Expected:
  ### Task X.Y: Task Title
  Description...

  **Validation:**
  - [ ] Checklist item 1
  - [ ] Checklist item 2
EOF
}

JSON_OUTPUT=false

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
        --list)
            MODE="list"
            shift
            ;;
        --count)
            MODE="count"
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
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

# Validate plan file
if [ -z "$PLAN_FILE" ]; then
    echo -e "${RED}Error: --plan argument required${NC}" >&2
    show_help
    exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
    echo -e "${RED}Error: Plan file not found: $PLAN_FILE${NC}" >&2
    exit 1
fi

# Function to list all tasks
list_tasks() {
    local plan="$1"
    local count=0

    echo -e "${BLUE}Tasks in: $(basename "$plan")${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    while IFS= read -r line; do
        if [[ "$line" =~ ^###[[:space:]]+Task[[:space:]]+([0-9]+\.[0-9]+):[[:space:]]*(.*) ]]; then
            task_id="${BASH_REMATCH[1]}"
            task_title="${BASH_REMATCH[2]}"
            count=$((count + 1))
            printf "  ${GREEN}%-6s${NC} %s\n" "$task_id" "$task_title"
        fi
    done < "$plan"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Total: ${YELLOW}$count${NC} tasks"
}

# Function to count tasks
count_tasks() {
    local plan="$1"
    grep -c "^### Task [0-9]\+\.[0-9]\+:" "$plan" || echo "0"
}

# Function to extract a specific task
extract_task() {
    local plan="$1"
    local task_id="$2"
    local found=false
    local in_task=false
    local task_title=""
    local task_content=""
    local validation_items=()
    local in_validation=false

    while IFS= read -r line; do
        # Check if we found our task
        if [[ "$line" =~ ^###[[:space:]]+Task[[:space:]]+${task_id}:[[:space:]]*(.*) ]]; then
            found=true
            in_task=true
            task_title="${BASH_REMATCH[1]}"
            continue
        fi

        # Check if we hit the next task or section (end of current task)
        if $in_task; then
            if [[ "$line" =~ ^###[[:space:]]+Task[[:space:]][0-9]+\.[0-9]+: ]] || \
               [[ "$line" =~ ^##[[:space:]]+ ]] || \
               [[ "$line" =~ ^---$ && ${#task_content} -gt 100 ]]; then
                break
            fi

            # Check for validation section
            if [[ "$line" =~ ^\*\*Validation:\*\* ]] || [[ "$line" =~ ^Validation: ]]; then
                in_validation=true
                continue
            fi

            # Collect validation items
            if $in_validation; then
                if [[ "$line" =~ ^-[[:space:]]*\[[[:space:]]*\][[:space:]]*(.*) ]]; then
                    validation_items+=("${BASH_REMATCH[1]}")
                elif [[ "$line" =~ ^-[[:space:]]*\[x\][[:space:]]*(.*) ]]; then
                    validation_items+=("${BASH_REMATCH[1]}")
                elif [[ -z "$line" ]]; then
                    # Empty line might end validation section
                    :
                elif [[ ! "$line" =~ ^-[[:space:]] ]]; then
                    # Non-list item ends validation
                    in_validation=false
                fi
            fi

            task_content+="$line"$'\n'
        fi
    done < "$plan"

    if ! $found; then
        echo -e "${RED}Error: Task $task_id not found in plan${NC}" >&2
        exit 1
    fi

    # Output
    if $JSON_OUTPUT; then
        # JSON output
        local validation_json="["
        local first=true
        for item in "${validation_items[@]}"; do
            if $first; then
                first=false
            else
                validation_json+=","
            fi
            # Escape backslashes first, then quotes for JSON
            item="${item//\\/\\\\}"
            item="${item//\"/\\\"}"
            validation_json+="\"$item\""
        done
        validation_json+="]"

        # Escape content for JSON
        local escaped_content="${task_content//\\/\\\\}"
        escaped_content="${escaped_content//\"/\\\"}"
        escaped_content="${escaped_content//$'\n'/\\n}"
        escaped_content="${escaped_content//$'\t'/\\t}"

        cat << EOF
{
  "taskId": "$task_id",
  "title": "$task_title",
  "content": "$escaped_content",
  "validationCount": ${#validation_items[@]},
  "validationItems": $validation_json
}
EOF
    else
        # Human-readable output
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}Task $task_id: $task_title${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "$task_content"
        echo ""
        echo -e "${YELLOW}Validation Items (${#validation_items[@]}):${NC}"
        for i in "${!validation_items[@]}"; do
            echo -e "  $((i+1)). ${validation_items[$i]}"
        done
    fi
}

# Main execution
case $MODE in
    list)
        list_tasks "$PLAN_FILE"
        ;;
    count)
        count_tasks "$PLAN_FILE"
        ;;
    task)
        if [ -z "$TASK_ID" ]; then
            echo -e "${RED}Error: --task requires a task ID${NC}" >&2
            exit 1
        fi
        extract_task "$PLAN_FILE" "$TASK_ID"
        ;;
esac
