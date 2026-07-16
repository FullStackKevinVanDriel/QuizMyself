# QuizMyself Security Cleanup & Branch Structure

**Created:** 2026-02-07  
**Status:** Ready to execute  
**Risk Level:** 🔴 High (destructive, requires force-push)

---

## 🔍 Secrets Found in Git History

### 1. Firebase API Key (Client-Side)
**Value:** `AIzaSyDC76Oepi1KPfHImPt51kTlgUT3X1iPWTY`  
**Location:** `index.html` (multiple commits throughout history)  
**Risk:** Low (Firebase client keys are meant to be public per Firebase docs)  
**Action:** Remove from history for best practice

### 2. Stripe Test Price IDs
**Values:**
- Monthly: `price_1SosTEE0LClU4PH9magrG0Bo`
- Yearly: `price_1SosUDE0LClU4PH9ycCWqpQ5`

**Location:** `index.html` (multiple commits)  
**Risk:** Low (test mode IDs, not live secrets)  
**Action:** Remove from history, rotate to new test products

---

## ⚙️ Execution Plan

### Phase 1: History Rewrite (Required First)

**Script:** `scripts/rewrite-history-remove-secrets.sh`

**What it does:**
1. Creates backup at `~/quizmyself-backup-TIMESTAMP/`
2. Rewrites ALL git history to replace secrets with placeholders
3. Leaves you ready to force-push

**Run:**
```bash
cd ~/Developer/QuizMyself
./scripts/rewrite-history-remove-secrets.sh
```

**After running:**
```bash
# Verify secrets are gone
git log --all --full-history -p | grep -i 'AIzaSy'
# (should return nothing)

# Force-push to GitHub
git push origin --force --all
git push origin --force --tags
```

**⚠️ CRITICAL:**
- This rewrites ALL commits
- Existing clones will be broken
- Cannot be undone (except from backup)
- Run during low-traffic time

---

### Phase 2: Branch Structure Setup

**Script:** `scripts/setup-branches.sh`

**What it does:**
1. Creates `staging` branch from `main`
2. Creates `dev` branch from `main`
3. Sets up GitHub branch protection rules

**Run:**
```bash
cd ~/Developer/QuizMyself
./scripts/setup-branches.sh
```

**Result:**
```
main (production)
  ├── staging (pre-production)
  └── dev (active development)
```

**Branch Protection:**
- **main:** Requires 1 PR approval, force-push disabled
- **staging:** Allows direct push for quick fixes
- **dev:** No protection, fast iteration

---

## 📋 Post-Cleanup Checklist

### Immediate (After History Rewrite)

- [ ] Verify secrets removed: `git log --all -p | grep AIzaSy`
- [ ] Force-push to GitHub
- [ ] Create new Firebase API key (Firebase Console → Project Settings)
- [ ] Create new Stripe test products (Stripe Dashboard → Products)
- [ ] Update `index.html` with new secrets (commit to `dev` first)
- [ ] Test payment flow with new Stripe price IDs

### Branch Setup (After Force-Push)

- [ ] Run `scripts/setup-branches.sh`
- [ ] Verify branch protection on GitHub
- [ ] Update CI/CD workflows if needed
- [ ] Document workflow in README

### Security Hardening (Future)

- [ ] Add `.env` file for local secrets (add to `.gitignore`)
- [ ] Use GitHub Secrets for CI/CD
- [ ] Set up TruffleHog or GitGuardian GitHub Action
- [ ] Rotate Firebase API key to restrict by domain

---

## 🚨 Rollback Plan

If something goes wrong:

```bash
# Restore from backup
cd ~
rm -rf ~/Developer/QuizMyself
cp -R ~/quizmyself-backup-TIMESTAMP ~/Developer/QuizMyself
cd ~/Developer/QuizMyself
git remote add origin https://github.com/FullStackKevinVanDriel/QuizMyself.git
```

**Note:** Backup is created automatically by the rewrite script.

---

## 📝 Workflow After Setup

### Feature Development
```bash
git checkout dev
git pull
git checkout -b feat/my-feature
# ... work ...
git commit -m "feat: description"
git push -u origin feat/my-feature
gh pr create --base dev --title "Feature: X"
gh pr merge --squash
```

### Staging Release
```bash
git checkout staging
git merge dev
git push
# QA testing on staging environment
```

### Production Release
```bash
git checkout main
gh pr create --head staging --base main --title "Release v1.2.3"
# Wait for approval (can self-approve)
gh pr merge --squash
git tag v1.2.3
git push --tags
```

---

## ❓ FAQ

### Will this break existing clones?
**Yes.** Anyone with a local copy needs to delete and re-clone. If you're the only dev, this is just you.

### Can I undo the history rewrite?
**Yes**, but only from the backup. Once you force-push, the old history is gone from GitHub (unless you have another remote).

### Is the Firebase API key actually a secret?
**Technically no.** Firebase client-side keys are meant to be public. They're protected by Firebase Security Rules, not by keeping the key secret. But removing it from history is still best practice.

### Do I need to rotate the Stripe keys?
**Yes**, but only the test price IDs. Create new test products in Stripe Dashboard and update `index.html`.

### What if I push secrets again by accident?
Set up a pre-commit hook or GitHub Action (TruffleHog) to catch secrets before they hit history.

---

## 🛠️ Tools Used

- **git-filter-repo:** Fast, safe history rewriting (install: `brew install git-filter-repo`)
- **GitHub CLI:** Branch protection setup (install: `brew install gh`)

---

## 📞 Support

If something breaks during execution:
1. Check the backup: `~/quizmyself-backup-TIMESTAMP/`
2. Review git logs: `git reflog`
3. Ask in #quizmyself Discord channel

---

**Ready to proceed?** Run Phase 1 first, verify, then Phase 2.
