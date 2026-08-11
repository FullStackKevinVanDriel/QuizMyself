#!/bin/bash
# QuizMyself - Create dev/staging/prod branch structure
# Run AFTER history rewrite and force-push

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "========================================="
echo "QuizMyself Branch Setup"
echo "========================================="
echo ""

# Ensure we're on main
git checkout main

# Create staging branch
echo "Creating staging branch..."
if git rev-parse --verify staging >/dev/null 2>&1; then
    echo "⚠️  staging branch already exists, skipping"
else
    git checkout -b staging
    git push -u origin staging
    echo "✅ Created staging branch"
fi

# Create dev branch
echo ""
echo "Creating dev branch..."
git checkout main
if git rev-parse --verify dev >/dev/null 2>&1; then
    echo "⚠️  dev branch already exists, skipping"
else
    git checkout -b dev
    git push -u origin dev
    echo "✅ Created dev branch"
fi

# Back to main
git checkout main

echo ""
echo "========================================="
echo "Branch Protection Setup"
echo "========================================="
echo ""
echo "Setting up branch protection rules via GitHub API..."

# Protect main branch
echo "Protecting main branch..."
gh api repos/FullStackKevinVanDriel/QuizMyself/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": false
  },
  "enforce_admins": false,
  "required_status_checks": null,
  "restrictions": null
}
EOF
echo "✅ Main branch protected (requires 1 PR approval)"

# Protect staging branch (lighter protection)
echo ""
echo "Protecting staging branch..."
gh api repos/FullStackKevinVanDriel/QuizMyself/branches/staging/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_pull_request_reviews": null,
  "enforce_admins": false,
  "required_status_checks": null,
  "restrictions": null
}
EOF
echo "✅ Staging branch protected (allows direct push)"

echo ""
echo "✅ Branch setup complete!"
echo ""
echo "Branch structure:"
echo "  main (production) - Protected, requires PR"
echo "  staging (pre-prod) - Protected, allows direct push"
echo "  dev (development) - No protection, fast iteration"
echo ""
echo "Workflow:"
echo "  feat/xyz → dev → staging → main"
echo ""
