#!/bin/bash

# Script de test d'intégration VeeoCore
# Usage: ./test-integration.sh [API_URL]

API_URL="${1:-http://localhost:4000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           VeeoCore Integration Tests                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing API at: $API_URL"
echo ""

# Compteurs
PASSED=0
FAILED=0
SKIPPED=0

# Fonction de test
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_code="$4"
    local data="$5"
    local headers="$6"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$url" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$url" \
            $headers)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $name - Expected $expected_code, got $http_code"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# ========================================
# 1. HEALTH CHECKS
# ========================================
echo ""
echo "────────────────────────────────────────"
echo "1. Health Checks"
echo "────────────────────────────────────────"

test_endpoint "Health endpoint" "GET" "/health" "200"
test_endpoint "API info" "GET" "/api" "200"
test_endpoint "API docs" "GET" "/api/docs" "200"
test_endpoint "Metrics JSON" "GET" "/metrics/json" "200"
test_endpoint "WebSocket stats" "GET" "/ws/stats" "200"

# ========================================
# 2. AUTH ENDPOINTS
# ========================================
echo ""
echo "────────────────────────────────────────"
echo "2. Authentication"
echo "────────────────────────────────────────"

# Test tenant login (will fail without real credentials but should return 401, not 500)
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/tenant/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "401" ] || [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓${NC} Tenant login endpoint responds correctly (HTTP $http_code)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Tenant login endpoint - Unexpected code $http_code"
    FAILED=$((FAILED + 1))
fi

# Test driver login
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/driver/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+33600000000","pin":"0000"}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "401" ] || [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓${NC} Driver login endpoint responds correctly (HTTP $http_code)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Driver login endpoint - Unexpected code $http_code"
    FAILED=$((FAILED + 1))
fi

# ========================================
# 3. PROTECTED ENDPOINTS (sans auth = 401)
# ========================================
echo ""
echo "────────────────────────────────────────"
echo "3. Protected Endpoints (expect 401)"
echo "────────────────────────────────────────"

test_endpoint "Pricing without API key" "POST" "/api/v1/pricing/quote" "401" '{"distanceKm":10}'
test_endpoint "Bookings without API key" "GET" "/api/v1/bookings" "401"
test_endpoint "Drivers without API key" "GET" "/api/v1/drivers" "401"
test_endpoint "Tenant dashboard without token" "GET" "/api/v1/tenant/dashboard/stats" "401"
test_endpoint "Driver profile without token" "GET" "/api/v1/driver/profile" "401"

# ========================================
# 4. STATIC FILES
# ========================================
echo ""
echo "────────────────────────────────────────"
echo "4. Static Files"
echo "────────────────────────────────────────"

test_endpoint "Demo page" "GET" "/demo/" "200"

# ========================================
# 5. API WITH TEST KEY (if available)
# ========================================
if [ -n "$TEST_API_KEY" ]; then
    echo ""
    echo "────────────────────────────────────────"
    echo "5. API with Test Key"
    echo "────────────────────────────────────────"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/pricing/quote" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $TEST_API_KEY" \
        -d '{"distanceKm":15,"durationMin":25,"vehicleType":"standard"}')
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✓${NC} Pricing calculation with API key"
        echo "   Response: $body"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} Pricing calculation failed - HTTP $http_code"
        FAILED=$((FAILED + 1))
    fi
else
    echo ""
    echo -e "${YELLOW}⚠${NC} Skipping authenticated tests (no TEST_API_KEY set)"
    SKIPPED=$((SKIPPED + 1))
fi

# ========================================
# RESULTS
# ========================================
echo ""
echo "════════════════════════════════════════"
echo "RESULTS"
echo "════════════════════════════════════════"
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
