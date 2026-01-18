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
├── index.html           # Single-page application (5,800+ lines)
├── playwright.config.js # Test configuration
├── tests/               # Playwright test suites
│   ├── smoke.spec.js
│   ├── guest-mode.spec.js
│   └── feedback.spec.js
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

---

## Bugs & Issues

### High Priority

#### Source Material UI Not Updating After Link
After associating a quiz with source material, the screen doesn't refresh to show the newly linked source material.

Additionally, when no quiz material/test material/program/mastered questions have been generated yet:
- The corresponding buttons should be **disabled**
- Buttons should be visually styled as disabled (grayed out)
- UI should **highlight** that material needs to be generated from the source

**Impact:** User confusion - they don't see feedback after linking, and can click buttons for content that doesn't exist yet

**Fix:**
1. Refresh the source material display after successful linking
2. Check for generated content and disable/style buttons accordingly
3. Add visual indicator (badge/tooltip) prompting user to generate material

#### Native Dialog Overuse
The app uses native `alert()`, `confirm()`, and `prompt()` dialogs extensively:
- Quiz creation success/failure messages
- Import validation and results
- Delete confirmations
- **Source material linking uses `prompt()` to select quiz** - very clunky UX

**Impact:** Blocks UI, can't be styled, poor mobile experience, interrupts flow

**Fix:** Replace all native dialogs with custom modal components

#### Debug Logging in Production
Multiple `console.log('[DEBUG ...]')` statements left in code:
- `showCourseContent` (lines 3540-3542)
- `viewSourceContent` (lines 4894, 4921, 4931)
- `linkSourceToQuiz` (lines 5079-5139)

**Fix:** Remove or add conditional debug flag

### Medium Priority

#### Inconsistent Patterns
- Mix of inline `onclick` handlers and `addEventListener`
- Heavy use of inline `style=""` instead of CSS classes
- Magic numbers hardcoded (3 for mastery, 100% for exam, 50 import limit)

#### Error Handling
- Many catch blocks show generic "Failed to..." messages
- No user-friendly error recovery options
- API errors not consistently surfaced

### Low Priority

#### Code Organization
- 5,800+ lines in single HTML file
- 162+ functions with no modular structure
- Global state object with 14+ properties

---

## Roadmap

### Immediate (Bugs/Polish)

- [x] **Replace native dialogs with custom modals**
  - [x] Success/error toasts instead of alert()
  - [x] Confirmation modal instead of confirm()
  - [x] Selection modal for source-to-quiz linking instead of prompt()
- [x] Remove debug console.log statements
- [ ] Consolidate Pro status check functions

### Short Term (UX Improvements)

- [ ] Progress dashboard showing completion percentage
- [ ] Search functionality across questions
- [ ] Better import error messages with line numbers
- [ ] Consistent form validation patterns

### Medium Term (Features)

- [ ] Flashcard mode for term memorization
- [ ] Dark/light theme toggle
- [ ] Export progress to PDF
- [ ] Bookmarking specific questions
- [ ] Study timer/Pomodoro feature

### Long Term (Architecture)

- [ ] Quiz sharing via public links
  - [ ] Optional `share_slug` (globally unique)
  - [ ] Public quiz view at `/q/{slug}`
  - [ ] Privacy controls
- [ ] PWA for mobile app experience
- [ ] Offline mode with service worker
- [ ] Consider framework migration (React/Vue/Svelte)

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

- [ ] Extract magic numbers to constants
- [ ] Organize state into logical groups (user, quiz, progress, exam)
- [ ] Consistent event handler patterns
- [ ] Move inline styles to CSS classes
- [ ] Add JSDoc comments to functions
- [ ] Expand test coverage:
  - [x] Category filtering
  - [x] Exam mode
  - [ ] Auth flows (login, register, reset)
  - [ ] Import functionality
  - [ ] Progress sync
  - [ ] Pro tier features

---

## Test Coverage

**Existing (19 tests):**
- smoke.spec.js - Page load, welcome screen, hamburger menu
- guest-mode.spec.js - Demo quiz without login
- feedback.spec.js - Feedback modal and submission
- category-filter.spec.js - Category toggle, All/None buttons, quiz filtering
- exam-mode.spec.js - Start exam, progress tracking, 100% requirement display

**Needed:**
- Auth flows (login, register, reset)
- Import (CSV, JSON, Q&A)
- Progress sync
- Source material linking
- Pro tier activation

---

## Notes

- Free tier: 50 question import limit
- Pro tier: Unlimited imports, 50MB storage
- Mastery requires 3 correct answers per question
- Exam requires 100% to pass
