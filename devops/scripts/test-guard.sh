#!/bin/bash
# Test script for guard.mjs AWS role validation
# Usage: ./test-guard.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD_SCRIPT="$SCRIPT_DIR/guard.mjs"

echo "Testing guard.mjs AWS role validation..."
echo "=========================================="

# Create a temporary test directory with .governance.json
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

cat > .governance.json <<'EOF'
{
  "allowedWriteAccounts": ["111111111111"],
  "allowedWriteProfiles": ["sandbox", "dev"],
  "allowedWriteRoles": ["arn:aws:iam::111111111111:role/DevOpsRole"]
}
EOF

echo "Created test directory: $TEST_DIR"
echo ""

# Test 1: Read-only command without role assumption (should pass)
echo "Test 1: Read-only command without role (should PASS)"
PAYLOAD='{"tool_name": "Bash", "tool_input": {"command": "aws s3 ls --profile sandbox"}}'
if echo "$PAYLOAD" | node "$GUARD_SCRIPT" 2>&1; then
    echo "✅ PASS: Read-only command allowed"
else
    echo "❌ FAIL: Read-only command was blocked"
fi
echo ""

# Test 2: Write command with allowed role (should pass)
echo "Test 2: Write command with allowed role (should PASS)"
PAYLOAD='{"tool_name": "Bash", "tool_input": {"command": "aws s3 cp file.txt s3://bucket/ --role-arn arn:aws:iam::111111111111:role/DevOpsRole --profile sandbox"}}'
if echo "$PAYLOAD" | node "$GUARD_SCRIPT" 2>&1; then
    echo "✅ PASS: Authorized role allowed"
else
    echo "❌ FAIL: Authorized role was blocked"
fi
echo ""

# Test 3: Write command with unauthorized role (should block)
echo "Test 3: Write command with unauthorized role (should BLOCK)"
PAYLOAD='{"tool_name": "Bash", "tool_input": {"command": "aws s3 cp file.txt s3://bucket/ --role-arn arn:aws:iam::999999999999:role/UnauthorizedRole --profile sandbox"}}'
if echo "$PAYLOAD" | node "$GUARD_SCRIPT" 2>&1; then
    echo "❌ FAIL: Unauthorized role was allowed"
else
    echo "✅ PASS: Unauthorized role was blocked"
fi
echo ""

# Test 4: Write command with allowed profile but no role (should pass)
echo "Test 4: Write command with allowed profile, no role (should PASS)"
PAYLOAD='{"tool_name": "Bash", "tool_input": {"command": "aws s3 cp file.txt s3://bucket/ --profile sandbox"}}'
if echo "$PAYLOAD" | node "$GUARD_SCRIPT" 2>&1; then
    echo "✅ PASS: Command without role allowed"
else
    echo "❌ FAIL: Command without role was blocked"
fi
echo ""

# Test 5: Write command with AWS_ROLE_ARN environment variable (should block if unauthorized)
echo "Test 5: Write command with AWS_ROLE_ARN env var (should BLOCK)"
PAYLOAD='{"tool_name": "Bash", "tool_input": {"command": "AWS_ROLE_ARN=arn:aws:iam::999999999999:role/BadRole aws s3 cp file.txt s3://bucket/ --profile sandbox"}}'
if echo "$PAYLOAD" | node "$GUARD_SCRIPT" 2>&1; then
    echo "❌ FAIL: Unauthorized role via env var was allowed"
else
    echo "✅ PASS: Unauthorized role via env var was blocked"
fi
echo ""

# Cleanup
cd -
rm -rf "$TEST_DIR"
echo "Cleanup complete. Test directory removed."
echo ""
echo "=========================================="
echo "All tests completed!"
