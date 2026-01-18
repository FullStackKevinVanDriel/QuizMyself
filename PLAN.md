# QuizMyself - Development Plan

## Project Overview

A self-study quiz tool with custom quiz imports and progress tracking.
- Custom quiz creation with multiple import formats
- Cloud sync across devices via Vandromeda API
- Practice mode with spaced repetition
- Final exam mode (100% required to pass)
- Free and Pro tiers with Stripe payments

**Live:** https://fullstackkevinvandriel.github.io/QuizMyself/

## Current Architecture

```
QuizMyself/
├── index.html           # Single-page application (7,100+ lines)
├── playwright.config.js # Test configuration
├── tests/               # Playwright test suites (10 files, 79 tests)
│   ├── smoke.spec.js
│   ├── guest-mode.spec.js
│   ├── feedback.spec.js
│   ├── category-filter.spec.js
│   ├── exam-mode.spec.js
│   ├── import.spec.js
│   ├── ai-generation.spec.js
│   ├── link-source.spec.js
│   └── roadmap.spec.js
└── test-data/           # Test fixtures
```

**Backend:** Vandromeda API (vandromeda.com/api/quizmyself/)
**Auth:** Firebase (email/password)
**Payments:** Stripe via Vandromeda
**Hosting:** GitHub Pages

---

## Existing Features

### Authentication
- [x] Firebase email/password auth
- [x] Password reset flow
- [x] Guest mode (keyword-only, no account required)
- [x] Dual auth support (Firebase + keyword-only users)

### Quiz Modes
- [x] Practice mode - spaced repetition, master questions after 3 correct
- [x] Final exam mode - 100% required, resumable across sessions
- [x] Demo mode - 310 questions across 24 categories, no login needed
- [x] Category filtering - toggle categories on/off

### Import & Data
- [x] JSON import: `[{"question": "...", "answer": "..."}]`
- [x] CSV import: question,answer rows
- [x] Q&A text import: "Q: ... A: ..." pairs
- [x] Drag-and-drop file upload
- [x] Import preview with format detection
- [x] Replace vs append modes
- [x] Source material storage and linking

### Progress & Sync
- [x] Cloud sync via Vandromeda API
- [x] Cross-device progress restore
- [x] localStorage caching
- [x] Exam progress persistence (resume after refresh)
- [x] Mastered questions management

### Pro Tier
- [x] Stripe payment integration
- [x] License key activation
- [x] Unlimited imports (free: 50 questions)
- [x] 50MB storage limit

### UI/UX
- [x] Dark theme with responsive design
- [x] Hamburger menu navigation
- [x] Custom modals for most features
- [x] Feedback submission system
- [x] In-app roadmap display (fetches from roadmap.json)

### Automation & CI/CD
- [x] Playwright test automation
- [x] GitHub Pages deployment
- [x] Feedback → GitHub Issues sync (hourly workflow)
- [x] Roadmap JSON generation from issues
- [x] Bidirectional issue status sync

---

## Bugs & Issues (SDLC Audit - Jan 2026)

### P0 Critical - Security

#### XSS in Keyword/Category Onclick Handlers
Inline `onclick` handlers use unescaped user input for keywords and category names.

**Affected code:**
- `keyword-item` onclick handlers (user-controlled keyword text)
- Category button onclick handlers (category names from imported data)

**Impact:** Malicious quiz imports could execute arbitrary JavaScript

**Fix:** Escape special characters or use `data-*` attributes with event delegation

### P1 High - Beta Blockers

#### Recruit Beta Users (CRITICAL)
No beta testers onboarded yet. Need 5-10 users to validate product-market fit.

**Actions:**
1. Create landing page with signup form
2. Personal outreach to 10 potential users
3. Offer incentive (free Pro tier for feedback)

#### Integrate Analytics
No usage tracking. Cannot measure retention, feature adoption, or drop-off points.

**Options:** Google Analytics 4, Plausible (privacy-friendly), or Mixpanel

#### Source Material UI Not Updating After Link
After associating a quiz with source material, the screen doesn't refresh to show the newly linked source.

**Fix:** Refresh source material display after successful linking

### P2 Medium - Stability

#### saveState Race Condition
Concurrent calls to `saveState()` can cause data corruption if cloud sync overlaps.

**Fix:** Add mutex/debounce to prevent parallel saves

#### CSV Parser Edge Cases
- Double-quoted fields with embedded commas fail
- Empty rows not handled gracefully

#### Flashcard Parser Fragility
`parseFlashcards()` splits on `\n\n` but doesn't handle Windows line endings or extra whitespace.

#### Missing Null Checks
Several functions assume state values exist without validation:
- `currentQuiz` accessed without null check in multiple places
- `progress` array operations without length verification

### P3 Low - Polish

#### Content Security Policy Missing
No CSP header. Should add to prevent XSS escalation.

#### Hardcoded Configuration
Magic numbers scattered throughout:
- `3` for mastery threshold
- `100` for exam pass percentage
- `50` for free tier import limit

**Fix:** Extract to `CONFIG` object at top of file

---

## Roadmap (SDLC-Derived - Jan 2026)

### Completed ✅

- [x] Replace native dialogs with custom modals (toasts, confirm, selection)
- [x] Remove debug console.log statements
- [x] Stripe payment integration
- [x] Cloud sync via Vandromeda API
- [x] AI quiz generation with tiered limits
- [x] Feedback submission system

### Sprint 1: Security & Beta Launch

- [ ] **Fix XSS vulnerabilities** (P0 Critical)
  - [ ] Escape keyword onclick handlers
  - [ ] Escape category button onclick handlers
  - [ ] Consider event delegation pattern
- [ ] **Recruit 5-10 beta users** (P1 High)
  - [ ] Personal outreach
  - [ ] Offer free Pro tier for feedback
- [ ] **Integrate analytics** (P1 High)
  - [ ] Choose provider (GA4 / Plausible / Mixpanel)
  - [ ] Add page views and key event tracking
  - [ ] Track: quiz starts, completions, imports, AI generations

### Sprint 2: Stability

- [ ] Fix source material UI refresh after linking
- [ ] Add saveState mutex/debounce
- [ ] Fix CSV parser edge cases (quoted fields, empty rows)
- [ ] Fix flashcard parser (Windows line endings)
- [ ] Add null checks for state access

### Sprint 3: Polish & Launch Prep

- [ ] Add Content Security Policy header
- [ ] Extract hardcoded config to CONFIG object
- [ ] Consolidate Pro status check functions
- [ ] Document Firebase API key exposure (acceptable risk)
- [ ] Beta feedback review and prioritization

### Post-Launch (Backlog)

- [ ] Quiz sharing via public links
- [ ] PWA for mobile app experience
- [ ] Offline mode with service worker
- [ ] Progress dashboard
- [ ] Search across questions

### Infrastructure (Decision Required)

- [ ] **Frontend hosting strategy**
  - Option A: Host on Vandromeda server (unified infrastructure)
  - Option B: Separate server (maintain separation of concerns)
  - Considerations: SSL, deployment pipeline, cost, maintenance overhead
- [ ] **Disaster recovery & continuity**
  - [ ] Database backup strategy (automated, off-site)
  - [ ] Service restoration runbook
  - [ ] Data export/import for user portability
  - [ ] Uptime monitoring and alerting

---

## Technical Debt

- [ ] Extract magic numbers to constants (see Sprint 3)
- [ ] Organize state into logical groups (user, quiz, progress, exam)
- [ ] Consistent event handler patterns (see XSS fix in Sprint 1)
- [ ] Move inline styles to CSS classes
- [ ] Add JSDoc comments to critical functions
- [ ] Expand test coverage:
  - [x] Category filtering
  - [x] Exam mode
  - [x] Import functionality (CSV, JSON, Q&A)
  - [x] Modal stacking
  - [x] AI generation
  - [x] Source-to-quiz linking
  - [x] Roadmap display
  - [ ] Auth flows (login, register, reset)
  - [ ] Progress sync
  - [ ] Pro tier features

---

## Test Coverage

**Existing (79 tests in 10 files):**
- smoke.spec.js - Page load, welcome screen, hamburger menu
- guest-mode.spec.js - Demo quiz without login
- feedback.spec.js - Feedback modal and submission
- category-filter.spec.js - Category toggle, All/None buttons, quiz filtering
- exam-mode.spec.js - Start exam, progress tracking, 100% requirement display
- import.spec.js - CSV, JSON, Q&A import flows, preview, file upload
- ai-generation.spec.js - AI quiz generation features
- link-source.spec.js - Source-to-quiz linking, selection modal, HTML escaping
- roadmap.spec.js - Roadmap modal display and interaction

**Needed:**
- Auth flows (login, register, reset)
- Progress sync
- Pro tier activation

---

## Notes

- Free tier: 50 question import limit
- Pro tier: Unlimited imports, 50MB storage
- Mastery requires 3 correct answers per question
- Exam requires 100% to pass
