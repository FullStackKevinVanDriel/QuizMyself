#!/bin/bash
# QuizMyself - Git History Rewrite to Remove Secrets
# WARNING: This is a destructive operation. Creates backup first.

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$HOME/quizmyself-backup-$(date +%Y%m%d-%H%M%S)"

echo "========================================="
echo "QuizMyself History Rewrite"
echo "========================================="
echo ""
echo "This script will:"
echo "1. Create a backup of your repo"
echo "2. Rewrite git history to remove exposed secrets"
echo "3. Prepare for force-push to GitHub"
echo ""
echo "⚠️  WARNING: This will rewrite ALL commit history"
echo "⚠️  Anyone with a clone will need to re-clone"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Check for git-filter-repo
echo ""
echo "Checking for git-filter-repo..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo not found"
    echo ""
    echo "Install it with:"
    echo "  brew install git-filter-repo    # macOS"
    echo "  pip3 install git-filter-repo    # cross-platform"
    echo ""
    exit 1
fi
echo "✅ git-filter-repo found"

# Create backup
echo ""
echo "Creating backup at: $BACKUP_DIR"
cp -R "$REPO_DIR" "$BACKUP_DIR"
echo "✅ Backup created"

# Navigate to repo
cd "$REPO_DIR"

# Ensure we're on main and up to date
echo ""
echo "Checking out main branch..."
git checkout main
git fetch origin

# Create expressions file for git-filter-repo
EXPRESSIONS_FILE="/tmp/quizmyself-secrets-$(date +%s).txt"
cat > "$EXPRESSIONS_FILE" <<'EOF'
# Firebase API Key
regex:AIzaSyDC76Oepi1KPfHImPt51kTlgUT3X1iPWTY==>FIREBASE_API_KEY_REDACTED

# Stripe Test Price IDs
regex:price_1SosTEE0LClU4PH9magrG0Bo==>STRIPE_MONTHLY_PRICE_REDACTED
regex:price_1SosUDE0LClU4PH9ycCWqpQ5==>STRIPE_YEARLY_PRICE_REDACTED
EOF

echo "✅ Created expressions file: $EXPRESSIONS_FILE"

# Rewrite history
echo ""
echo "Rewriting history (this may take a minute)..."
git-filter-repo --replace-text "$EXPRESSIONS_FILE" --force

echo "✅ History rewritten"

# Clean up expressions file
rm "$EXPRESSIONS_FILE"

# Show what changed
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Secrets removed from history:"
echo "  - Firebase API key"
echo "  - Stripe test price IDs"
echo ""
echo "Backup location:"
echo "  $BACKUP_DIR"
echo ""
echo "========================================="
echo "Next Steps"
echo "========================================="
echo ""
echo "1. Review changes:"
echo "   git log --oneline | head -20"
echo ""
echo "2. Verify secrets are gone:"
echo "   git log --all --full-history -p | grep -i 'AIzaSy'"
echo "   (should return nothing)"
echo ""
echo "3. Force-push to GitHub:"
echo "   git remote add origin https://github.com/FullStackKevinVanDriel/QuizMyself.git"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "4. Update current secrets in index.html with:"
echo "   - New Firebase API key (from Firebase console)"
echo "   - New Stripe price IDs (create new test products)"
echo ""
echo "5. Notify collaborators (if any) to re-clone:"
echo "   git clone https://github.com/FullStackKevinVanDriel/QuizMyself.git"
echo ""
echo "⚠️  DO NOT push old secrets back to repo!"
echo ""
