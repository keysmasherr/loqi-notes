#!/bin/bash
# Fetches a fresh Supabase auth token for the test user
# Usage: ./scripts/get-supabase-token.sh [--raw]
# --raw: Output only the access_token (for piping to other commands)

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source credentials from .env files
if [ -f "$PROJECT_ROOT/apps/api/.env" ]; then
  export $(grep -E '^(SUPABASE_URL|SUPABASE_ANON_KEY)=' "$PROJECT_ROOT/apps/api/.env" | xargs)
fi

if [ -f "$PROJECT_ROOT/apps/api/.env.test-credentials" ]; then
  export $(grep -E '^(TEST_USER_EMAIL|TEST_USER_PASSWORD)=' "$PROJECT_ROOT/apps/api/.env.test-credentials" | xargs)
fi

# Validate required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in apps/api/.env" >&2
  exit 1
fi

if [ -z "$TEST_USER_EMAIL" ] || [ -z "$TEST_USER_PASSWORD" ]; then
  echo "Error: Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in apps/api/.env.test-credentials" >&2
  exit 1
fi

# Fetch token
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_USER_EMAIL}\", \"password\": \"${TEST_USER_PASSWORD}\"}")

# Check for error
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "Error fetching token:" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

# Output based on mode
if [ "$1" = "--raw" ]; then
  echo "$RESPONSE" | jq -r '.access_token'
else
  echo "=== Supabase Auth Token ==="
  echo ""
  echo "Access Token:"
  echo "$RESPONSE" | jq -r '.access_token'
  echo ""
  echo "User ID: $(echo "$RESPONSE" | jq -r '.user.id')"
  echo "Email: $(echo "$RESPONSE" | jq -r '.user.email')"
  echo "Expires in: $(echo "$RESPONSE" | jq -r '.expires_in') seconds"
  echo ""
  echo "Use with curl:"
  echo "  -H \"Authorization: Bearer \$(./scripts/get-supabase-token.sh --raw)\""
fi
