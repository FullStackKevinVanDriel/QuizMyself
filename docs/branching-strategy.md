# QuizMyself Branching Strategy

## Branch Structure

```
main (production)
  ├── staging (pre-production testing)
  └── dev (active development)
```

## Branch Descriptions

### `main` - Production
- **Purpose:** Live production code
- **Protection:** Requires PR approval, all tests must pass
- **Deploys to:** GitHub Pages (https://fullstackkevinvandriel.github.io/QuizMyself/)
- **Update cadence:** Weekly releases (or hotfixes as needed)

### `staging` - Pre-Production
- **Purpose:** Final QA before production
- **Protection:** Requires PR approval
- **Deploys to:** Staging environment (TBD)
- **Update cadence:** After feature completion, before production

### `dev` - Development
- **Purpose:** Active feature development
- **Protection:** Minimal (can push directly for rapid iteration)
- **Deploys to:** Dev environment (local or dev subdomain)
- **Update cadence:** Continuous

## Workflow

### Feature Development
1. Branch from `dev`: `git checkout -b feat/my-feature dev`
2. Develop + commit
3. PR to `dev` (can be merged immediately if solo dev)
4. Test in dev environment

### Staging Release
1. When `dev` is stable: PR from `dev` → `staging`
2. QA testing on staging environment
3. Fix bugs if needed (PR to `staging` or cherry-pick from `dev`)

### Production Release
1. When `staging` is verified: PR from `staging` → `main`
2. Tag release: `git tag v1.2.3`
3. Deploy to production (GitHub Pages auto-deploys from `main`)

### Hotfixes
1. Branch from `main`: `git checkout -b hotfix/critical-bug main`
2. Fix + commit
3. PR to `main` (expedited review)
4. Cherry-pick back to `staging` and `dev`

## GitHub Actions Workflows

### On PR to `main`
- Run full test suite
- Require 1 approval (can be self-approval for solo dev)
- Check for secrets exposure (using TruffleHog or similar)

### On PR to `staging`
- Run test suite
- Optional approval

### On PR to `dev`
- Run basic linting
- No approval required

## Current State

**As of 2026-02-07:**
- `main` exists and is protected (force-push disabled)
- `staging` and `dev` need to be created
- History rewrite needed to remove secrets before branching

## Setup Commands

```bash
# After history rewrite, create branches:
git checkout main
git checkout -b staging
git push -u origin staging

git checkout main
git checkout -b dev
git push -u origin dev

# Update GitHub branch protection rules via gh CLI:
gh api repos/FullStackKevinVanDriel/QuizMyself/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=false \
  --field required_status_checks=null

gh api repos/FullStackKevinVanDriel/QuizMyself/branches/staging/protection \
  --method PUT \
  --field required_pull_request_reviews=null \
  --field enforce_admins=false

# dev branch: No protection needed (fast iteration)
```

## Migration Plan

1. ✅ Document current secrets
2. ⏳ Rewrite history to remove secrets
3. ⏳ Force-push cleaned history
4. ⏳ Create `staging` and `dev` branches
5. ⏳ Update GitHub branch protection
6. ⏳ Update CI/CD workflows
7. ⏳ Notify any collaborators (if applicable)

---

**Note:** History rewriting will require force-push and will break existing clones. Anyone with a local copy needs to re-clone after this operation.
