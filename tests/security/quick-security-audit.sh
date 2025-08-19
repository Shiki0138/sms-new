#!/bin/bash
# Quick Security Audit Script for Salon Lumière System
# Run this before each deployment

echo "🔒 Starting Security Audit..."
echo "================================"

# Check if server is running
SERVER_URL="http://localhost:3003"
if ! curl -s $SERVER_URL/health > /dev/null; then
    echo "❌ Server not running on $SERVER_URL"
    echo "   Start server with: PORT=3003 node src/server-simple.js"
    exit 1
fi

echo "✅ Server is running"

# Test 1: XSS Vulnerability
echo -e "\n📝 Testing XSS Protection..."
TOKEN=$(curl -s -X POST $SERVER_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@salon-lumiere.com","password":"password123"}' | \
    grep -o '"token":"[^"]*' | cut -d'"' -f4)

RESPONSE=$(curl -s -X POST $SERVER_URL/api/customers \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"firstName":"<script>alert(1)</script>","lastName":"Test","email":"xss@test.com","phoneNumber":"090-1234-5678"}')

if echo "$RESPONSE" | grep -q "<script>"; then
    echo "❌ XSS Vulnerability: Input not sanitized"
else
    echo "✅ XSS Protection: Input properly sanitized"
fi

# Test 2: SQL Injection
echo -e "\n📝 Testing SQL Injection Protection..."
SQL_RESPONSE=$(curl -s -X POST $SERVER_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"\" OR \"1\"=\"1"}' 2>&1)

if echo "$SQL_RESPONSE" | grep -q "Login successful"; then
    echo "❌ SQL Injection Vulnerability detected"
else
    echo "✅ SQL Injection Protection: Working"
fi

# Test 3: Rate Limiting
echo -e "\n📝 Testing Rate Limiting..."
FAILED_COUNT=0
for i in {1..20}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $SERVER_URL/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"wrong@test.com","password":"wrongpass"}')
    if [ "$STATUS" == "429" ]; then
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

if [ $FAILED_COUNT -gt 0 ]; then
    echo "✅ Rate Limiting: Active (blocked $FAILED_COUNT/20 requests)"
else
    echo "❌ Rate Limiting: Not implemented (0/20 requests blocked)"
fi

# Test 4: CORS Configuration
echo -e "\n📝 Testing CORS Configuration..."
CORS_HEADER=$(curl -s -I -X OPTIONS $SERVER_URL/api/auth/login \
    -H "Origin: http://evil.com" \
    -H "Access-Control-Request-Method: POST" | \
    grep "Access-Control-Allow-Origin")

if echo "$CORS_HEADER" | grep -q "*"; then
    echo "❌ CORS: Too permissive (allows all origins)"
else
    echo "✅ CORS: Properly restricted"
fi

# Test 5: Security Headers
echo -e "\n📝 Checking Security Headers..."
HEADERS=$(curl -s -I $SERVER_URL/health)

check_header() {
    if echo "$HEADERS" | grep -qi "$1"; then
        echo "✅ $1: Present"
    else
        echo "❌ $1: Missing"
    fi
}

check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Content-Security-Policy"
check_header "Strict-Transport-Security"

# Test 6: Authentication
echo -e "\n📝 Testing Authentication..."
UNAUTH_RESPONSE=$(curl -s $SERVER_URL/api/customers)
if echo "$UNAUTH_RESPONSE" | grep -q "Please authenticate"; then
    echo "✅ Authentication: Required for protected routes"
else
    echo "❌ Authentication: Not properly enforced"
fi

# Test 7: Environment Variables
echo -e "\n📝 Checking Environment Configuration..."
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET: Not set (using default - INSECURE)"
else
    echo "✅ JWT_SECRET: Configured"
fi

# Summary
echo -e "\n================================"
echo "🏁 Security Audit Complete"
echo "Check the results above and fix any ❌ items before production deployment"
echo "For detailed report, see: tests/PRODUCTION_READINESS_REPORT.md"