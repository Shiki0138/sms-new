#!/bin/bash
# Monthly Security Audit Script for Salon Lumière
# Run this script on the 1st of every month

echo "======================================"
echo "🔐 Salon Lumière Monthly Security Audit"
echo "Date: $(date +%Y-%m-%d)"
echo "======================================"
echo ""

# Create audit results directory
AUDIT_DIR="security-audits/$(date +%Y-%m)"
mkdir -p "$AUDIT_DIR"

# 1. NPM Vulnerability Scan
echo "1. Running npm vulnerability scan..."
echo "-----------------------------------"
npm audit > "$AUDIT_DIR/npm-audit.txt" 2>&1
CRITICAL=$(grep -c "Critical" "$AUDIT_DIR/npm-audit.txt" || echo "0")
HIGH=$(grep -c "High" "$AUDIT_DIR/npm-audit.txt" || echo "0")

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo "⚠️  Found $CRITICAL critical and $HIGH high vulnerabilities"
    echo "Running npm audit fix..."
    npm audit fix >> "$AUDIT_DIR/npm-audit-fix.txt" 2>&1
else
    echo "✅ No critical or high vulnerabilities found"
fi
echo ""

# 2. Check outdated packages
echo "2. Checking for outdated packages..."
echo "-----------------------------------"
npm outdated > "$AUDIT_DIR/npm-outdated.txt" 2>&1
OUTDATED=$(wc -l < "$AUDIT_DIR/npm-outdated.txt")
echo "📦 Found $OUTDATED outdated packages"
echo ""

# 3. Environment variables check
echo "3. Checking environment variables..."
echo "-----------------------------------"
ENV_ISSUES=0
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET not set"
    ((ENV_ISSUES++))
fi
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not set"
    ((ENV_ISSUES++))
fi
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY not set"
    ((ENV_ISSUES++))
fi
if [ "$ENV_ISSUES" -eq 0 ]; then
    echo "✅ All required environment variables are set"
fi
echo ""

# 4. Check for hardcoded secrets
echo "4. Scanning for hardcoded secrets..."
echo "-----------------------------------"
# Basic scan for common secret patterns
grep -r -E "(password|secret|api_key|apikey|token)" \
    --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.git \
    . 2>/dev/null | grep -v -E "(process\.env|import|require|const.*=.*process)" \
    > "$AUDIT_DIR/potential-secrets.txt"

SECRETS=$(wc -l < "$AUDIT_DIR/potential-secrets.txt")
if [ "$SECRETS" -gt 0 ]; then
    echo "⚠️  Found $SECRETS potential hardcoded secrets. Review $AUDIT_DIR/potential-secrets.txt"
else
    echo "✅ No obvious hardcoded secrets found"
fi
echo ""

# 5. SSL Certificate check (if applicable)
echo "5. SSL Certificate Status..."
echo "-----------------------------------"
if [ -f "/etc/letsencrypt/live/*/cert.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/*/cert.pem | cut -d= -f2)
    echo "📅 SSL Certificate expires: $CERT_EXPIRY"
else
    echo "ℹ️  No SSL certificate found (OK for local development)"
fi
echo ""

# 6. Generate summary report
echo "======================================"
echo "📊 AUDIT SUMMARY"
echo "======================================"
cat > "$AUDIT_DIR/summary.txt" <<EOF
Monthly Security Audit Report
Date: $(date +%Y-%m-%d)

VULNERABILITIES:
- Critical: $CRITICAL
- High: $HIGH
- Outdated packages: $OUTDATED

CONFIGURATION:
- Environment variable issues: $ENV_ISSUES
- Potential hardcoded secrets: $SECRETS

ACTIONS REQUIRED:
EOF

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo "- Fix npm vulnerabilities immediately" >> "$AUDIT_DIR/summary.txt"
fi
if [ "$ENV_ISSUES" -gt 0 ]; then
    echo "- Configure missing environment variables" >> "$AUDIT_DIR/summary.txt"
fi
if [ "$SECRETS" -gt 0 ]; then
    echo "- Review and remove hardcoded secrets" >> "$AUDIT_DIR/summary.txt"
fi

cat "$AUDIT_DIR/summary.txt"
echo ""
echo "Full audit results saved to: $AUDIT_DIR/"
echo ""

# 7. Create next month reminder
echo "📅 Next audit scheduled for: $(date -d '+1 month' +%Y-%m-01)"
echo ""

# Optional: Send notification
# You can add email notification here if needed
# echo "Audit complete" | mail -s "Monthly Security Audit - $(date +%Y-%m)" admin@salon-lumiere.com