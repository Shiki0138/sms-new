#!/bin/bash

# Authentication Security Test Suite
# Tests for the SMS Management System Authentication API

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${1:-"http://localhost:3001"}
LOGIN_ENDPOINT="$BASE_URL/api/auth/login"
ME_ENDPOINT="$BASE_URL/api/auth/me"

echo -e "${BLUE}🔒 SMS Authentication Security Test Suite${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "Testing endpoint: $LOGIN_ENDPOINT"
echo ""

# Test 1: Valid Login
echo -e "${YELLOW}Test 1: Valid Login${NC}"
VALID_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@salon-lumiere.com","password":"password123"}')

HTTP_CODE="${VALID_RESPONSE: -3}"
RESPONSE_BODY="${VALID_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Valid login successful (HTTP $HTTP_CODE)${NC}"
    TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    if [ ! -z "$TOKEN" ]; then
        echo -e "${GREEN}✓ JWT token received${NC}"
    else
        echo -e "${RED}✗ JWT token not found in response${NC}"
    fi
else
    echo -e "${RED}✗ Valid login failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 2: Invalid Credentials
echo -e "${YELLOW}Test 2: Invalid Credentials${NC}"
INVALID_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@salon-lumiere.com","password":"wrongpassword"}')

HTTP_CODE="${INVALID_RESPONSE: -3}"
RESPONSE_BODY="${INVALID_RESPONSE%???}"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Invalid credentials properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Invalid credentials not properly handled (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 3: Missing Fields
echo -e "${YELLOW}Test 3: Missing Email Field${NC}"
MISSING_EMAIL=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}')

HTTP_CODE="${MISSING_EMAIL: -3}"
if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Missing email properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Missing email not properly handled (HTTP $HTTP_CODE)${NC}"
fi

echo -e "${YELLOW}Test 4: Missing Password Field${NC}"
MISSING_PASSWORD=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@salon-lumiere.com"}')

HTTP_CODE="${MISSING_PASSWORD: -3}"
if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Missing password properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Missing password not properly handled (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 5: SQL Injection Attempt
echo -e "${YELLOW}Test 5: SQL Injection Protection${NC}"
SQL_INJECTION=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\''OR 1=1--","password":"any"}')

HTTP_CODE="${SQL_INJECTION: -3}"
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ SQL injection attempt properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ SQL injection attempt not properly handled (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 6: Rate Limiting (if implemented)
echo -e "${YELLOW}Test 6: Rate Limiting${NC}"
echo "Sending 6 rapid requests to test rate limiting..."

for i in {1..6}; do
    RATE_TEST=$(curl -s -w "%{http_code}" -X POST "$LOGIN_ENDPOINT" \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"wrong"}')
    
    HTTP_CODE="${RATE_TEST: -3}"
    
    if [ "$HTTP_CODE" = "429" ]; then
        echo -e "${GREEN}✓ Rate limiting activated after $i attempts (HTTP $HTTP_CODE)${NC}"
        break
    elif [ "$i" = "6" ]; then
        echo -e "${YELLOW}⚠ Rate limiting not detected (may not be implemented)${NC}"
    fi
done
echo ""

# Test 7: CORS Headers
echo -e "${YELLOW}Test 7: CORS Headers${NC}"
CORS_TEST=$(curl -s -I -X OPTIONS "$LOGIN_ENDPOINT" \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST")

if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin: \*"; then
    echo -e "${RED}✗ Insecure CORS: Allows all origins (*)${NC}"
elif echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin:"; then
    CORS_ORIGIN=$(echo "$CORS_TEST" | grep "Access-Control-Allow-Origin:" | cut -d' ' -f2-)
    echo -e "${GREEN}✓ CORS configured with specific origin: $CORS_ORIGIN${NC}"
else
    echo -e "${YELLOW}⚠ CORS headers not found or not configured${NC}"
fi
echo ""

# Test 8: JWT Token Validation (if token was obtained)
if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}Test 8: JWT Token Validation${NC}"
    
    # Test with valid token
    TOKEN_TEST=$(curl -s -w "%{http_code}" -X GET "$ME_ENDPOINT" \
      -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE="${TOKEN_TEST: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Valid JWT token accepted (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Valid JWT token rejected (HTTP $HTTP_CODE)${NC}"
    fi
    
    # Test with invalid token
    INVALID_TOKEN_TEST=$(curl -s -w "%{http_code}" -X GET "$ME_ENDPOINT" \
      -H "Authorization: Bearer invalid.jwt.token")
    
    HTTP_CODE="${INVALID_TOKEN_TEST: -3}"
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✓ Invalid JWT token properly rejected (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Invalid JWT token not properly handled (HTTP $HTTP_CODE)${NC}"
    fi
    
    # Test without token
    NO_TOKEN_TEST=$(curl -s -w "%{http_code}" -X GET "$ME_ENDPOINT")
    
    HTTP_CODE="${NO_TOKEN_TEST: -3}"
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✓ Missing JWT token properly rejected (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}✗ Missing JWT token not properly handled (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${YELLOW}Test 8: JWT Token Validation${NC}"
    echo -e "${YELLOW}⚠ Skipped (no token obtained from login test)${NC}"
fi
echo ""

# Test 9: HTTP Methods
echo -e "${YELLOW}Test 9: HTTP Methods${NC}"
GET_METHOD=$(curl -s -w "%{http_code}" -X GET "$LOGIN_ENDPOINT")
HTTP_CODE="${GET_METHOD: -3}"

if [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✓ GET method properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ GET method not properly handled (HTTP $HTTP_CODE)${NC}"
fi

PUT_METHOD=$(curl -s -w "%{http_code}" -X PUT "$LOGIN_ENDPOINT")
HTTP_CODE="${PUT_METHOD: -3}"

if [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✓ PUT method properly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ PUT method not properly handled (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 10: Security Headers
echo -e "${YELLOW}Test 10: Security Headers${NC}"
HEADERS_TEST=$(curl -s -I -X POST "$LOGIN_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}')

if echo "$HEADERS_TEST" | grep -q "X-Content-Type-Options: nosniff"; then
    echo -e "${GREEN}✓ X-Content-Type-Options header present${NC}"
else
    echo -e "${RED}✗ X-Content-Type-Options header missing${NC}"
fi

if echo "$HEADERS_TEST" | grep -q "X-Frame-Options: DENY"; then
    echo -e "${GREEN}✓ X-Frame-Options header present${NC}"
else
    echo -e "${RED}✗ X-Frame-Options header missing${NC}"
fi

if echo "$HEADERS_TEST" | grep -q "X-XSS-Protection"; then
    echo -e "${GREEN}✓ X-XSS-Protection header present${NC}"
else
    echo -e "${RED}✗ X-XSS-Protection header missing${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}🔒 Security Test Summary${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "${GREEN}✓ = Pass${NC}"
echo -e "${RED}✗ = Fail${NC}" 
echo -e "${YELLOW}⚠ = Warning/Not Implemented${NC}"
echo ""
echo "Manual verification recommended for:"
echo "- Password strength requirements"
echo "- Account lockout after multiple failures"
echo "- Session timeout behavior"
echo "- Audit logging of security events"
echo ""
echo "Run this script against your production environment:"
echo "./auth-security-test.sh https://yourdomain.com"