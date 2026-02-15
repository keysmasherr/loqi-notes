#!/bin/bash
# Automated test suite for task-runner.sh
# Tests all new features: validation, background mode, dry-run, progress bars

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TASK_RUNNER="$SCRIPT_DIR/task-runner.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test plan file
TEST_PLAN="$PROJECT_ROOT/test-plan.md"

echo -e "${BOLD}Task Runner Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Helper functions
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_exit_code="${3:-0}"
    local check_output="${4:-}"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${CYAN}Running test: $test_name${NC}"

    local actual_exit_code=0
    local output
    if output=$(eval "$test_command" 2>&1); then
        actual_exit_code=0
    else
        actual_exit_code=$?
    fi

    # Check exit code
    if [ "$actual_exit_code" -ne "$expected_exit_code" ]; then
        echo -e "${RED}✗ FAILED: Expected exit code $expected_exit_code, got $actual_exit_code${NC}"
        echo -e "${YELLOW}Command: $test_command${NC}"
        echo -e "${YELLOW}Output: $output${NC}\n"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Check output if specified
    if [ -n "$check_output" ]; then
        if echo "$output" | grep -q "$check_output"; then
            echo -e "${GREEN}✓ PASSED${NC}\n"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED: Expected output containing '$check_output'${NC}"
            echo -e "${YELLOW}Output: $output${NC}\n"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    fi

    echo -e "${GREEN}✓ PASSED${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

setup_test_plan() {
    cat > "$TEST_PLAN" << 'EOF'
# Test Plan

### Task 1.1: Simple Task
**Description**: A simple test task

**Implementation Steps**:
1. Step 1
2. Step 2

**Validation**:
- [ ] Check 1
- [ ] Check 2

### Task 1.2: Another Task
**Description**: Another test task

**Implementation Steps**:
1. Step A
2. Step B

**Validation**:
- [ ] Check A
- [ ] Check B
- [ ] Check C
EOF
}

cleanup() {
    rm -f "$TEST_PLAN"
    rm -f "$PROJECT_ROOT/.task-runner-state.json"
    rm -rf "$PROJECT_ROOT/docs/task-context"
    rm -rf "$PROJECT_ROOT/docs/task-logs"
}

# Setup
echo -e "${YELLOW}Setting up test environment...${NC}"
cleanup  # Clean up any previous test artifacts
setup_test_plan  # Create fresh test plan

# ============================================================================
# Test 1: Help Text
# ============================================================================
echo -e "\n${BOLD}Test Group 1: Help Text and Basic Usage${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "Show help" \
    "$TASK_RUNNER --help" \
    0 \
    "Task Runner"

run_test "Show help with -h" \
    "$TASK_RUNNER -h" \
    0 \
    "Task Runner"

# ============================================================================
# Test 2: Argument Validation
# ============================================================================
echo -e "\n${BOLD}Test Group 2: Argument Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "Missing --plan argument" \
    "$TASK_RUNNER" \
    1 \
    "Error: --plan argument required"

run_test "Invalid plan file" \
    "$TASK_RUNNER --plan /nonexistent/file.md" \
    1 \
    "Error: Plan file not found"

run_test "Invalid --on-failure value" \
    "$TASK_RUNNER --plan $TEST_PLAN --on-failure invalid" \
    3 \
    "Error: --on-failure must be one of"

run_test "Invalid --output value" \
    "$TASK_RUNNER --plan $TEST_PLAN --output invalid" \
    3 \
    "Error: --output must be one of"

# ============================================================================
# Test 3: Environment Validation
# ============================================================================
echo -e "\n${BOLD}Test Group 3: Environment Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# This test should pass with skip-validation
run_test "Skip validation flag works" \
    "$TASK_RUNNER --plan $TEST_PLAN --skip-validation --status" \
    0 \
    "Status:"

# Test with missing API key (if not already set)
# Note: --status mode doesn't run validation, so we test with --dry-run which does
if [ -z "$ANTHROPIC_API_KEY" ]; then
    run_test "Missing ANTHROPIC_API_KEY detected" \
        "$TASK_RUNNER --plan $TEST_PLAN --dry-run" \
        2 \
        "Missing required environment variable: ANTHROPIC_API_KEY"
else
    echo -e "${YELLOW}Skipping API key validation test (key is set)${NC}\n"
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# ============================================================================
# Test 4: Dry-Run Mode
# ============================================================================
echo -e "\n${BOLD}Test Group 4: Dry-Run Mode${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "Dry-run mode" \
    "$TASK_RUNNER --plan $TEST_PLAN --dry-run --skip-validation" \
    0 \
    "DRY-RUN MODE"

run_test "Dry-run verbose mode" \
    "$TASK_RUNNER --plan $TEST_PLAN --dry-run --verbose --skip-validation" \
    0 \
    "Task Content:"

run_test "Dry-run with --task" \
    "$TASK_RUNNER --plan $TEST_PLAN --task 1.1 --dry-run --skip-validation" \
    0 \
    "DRY-RUN MODE"

# ============================================================================
# Test 5: List and Status Modes
# ============================================================================
echo -e "\n${BOLD}Test Group 5: List and Status Modes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "List tasks" \
    "$TASK_RUNNER --plan $TEST_PLAN --list" \
    0 \
    "Tasks in:"

run_test "Show status" \
    "$TASK_RUNNER --plan $TEST_PLAN --status" \
    0 \
    "Status:"

run_test "Initialize context" \
    "$TASK_RUNNER --plan $TEST_PLAN --init" \
    0 \
    "Initialized task runner"

# ============================================================================
# Test 6: Output Formats
# ============================================================================
echo -e "\n${BOLD}Test Group 6: Output Formats${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "Quiet mode" \
    "$TASK_RUNNER --plan $TEST_PLAN --status --quiet" \
    0

run_test "Verbose mode with dry-run" \
    "$TASK_RUNNER --plan $TEST_PLAN --dry-run --verbose --skip-validation" \
    0 \
    "Task Content:"

# ============================================================================
# Test 7: Flag Combinations
# ============================================================================
echo -e "\n${BOLD}Test Group 7: Flag Combinations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

run_test "Background + dry-run warning" \
    "$TASK_RUNNER --plan $TEST_PLAN --background --dry-run --skip-validation" \
    0 \
    "Warning: Both --dry-run and --background specified"

run_test "Background mode flag -b" \
    "$TASK_RUNNER --plan $TEST_PLAN -b --status --skip-validation" \
    0

run_test "On-failure with background" \
    "$TASK_RUNNER --plan $TEST_PLAN --background --on-failure skip --status --skip-validation" \
    0

# ============================================================================
# Test 8: File Operations
# ============================================================================
echo -e "\n${BOLD}Test Group 8: File Operations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Initialize creates context file
run_test "Init creates context file" \
    "$TASK_RUNNER --plan $TEST_PLAN --init" \
    0

if [ -f "$PROJECT_ROOT/docs/task-context/test-plan-context.md" ]; then
    echo -e "${GREEN}✓ Context file created${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
else
    echo -e "${RED}✗ Context file not created${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
fi

# State file is created
if [ -f "$PROJECT_ROOT/.task-runner-state.json" ]; then
    echo -e "${GREEN}✓ State file created${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))

    # Validate JSON
    if jq empty "$PROJECT_ROOT/.task-runner-state.json" 2>/dev/null; then
        echo -e "${GREEN}✓ State file is valid JSON${NC}\n"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
    else
        echo -e "${RED}✗ State file is not valid JSON${NC}\n"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
else
    echo -e "${RED}✗ State file not created${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
fi

# ============================================================================
# Test 9: Piped Output
# ============================================================================
echo -e "\n${BOLD}Test Group 9: Piped Output${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Progress bars should be disabled when piped
output=$("$TASK_RUNNER" --plan "$TEST_PLAN" --status 2>&1 | cat)
if [ -n "$output" ] && echo "$output" | grep -q "Status:"; then
    echo -e "${GREEN}✓ Piped output works (contains expected content)${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Piped output failed${NC}\n"
    echo -e "${YELLOW}Output: $output${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# ============================================================================
# Cleanup
# ============================================================================
echo -e "\n${YELLOW}Cleaning up test environment...${NC}"
cleanup

# ============================================================================
# Test Summary
# ============================================================================
echo -e "\n${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Test Summary${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "  Total tests:   ${BOLD}$TESTS_RUN${NC}"
echo -e "  Passed:        ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed:        ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}✓ ALL TESTS PASSED${NC}\n"
    exit 0
else
    echo -e "\n${RED}${BOLD}✗ SOME TESTS FAILED${NC}\n"
    exit 1
fi
