# QuizMyself - Complete Documentation

> **Version:** 0.1.2
> **Live:** https://fullstackkevinvandriel.github.io/QuizMyself/
> **Repository:** https://github.com/FullStackKevinVanDriel/QuizMyself

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Guide](#2-user-guide)
3. [Architecture](#3-architecture)
4. [Frontend Reference](#4-frontend-reference)
5. [Backend API Reference](#5-backend-api-reference)
6. [Database Schema](#6-database-schema)
7. [Authentication](#7-authentication)
8. [Testing Guide](#8-testing-guide)
9. [CI/CD & Automation](#9-cicd--automation)
10. [Configuration](#10-configuration)
11. [Migration Guide](#11-migration-guide)
12. [Security](#12-security)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

### What is QuizMyself?

QuizMyself is a self-study quiz application with:
- Custom quiz imports (JSON, CSV, Q&A text)
- Cloud sync across devices
- Spaced repetition practice mode
- Final exam mode (100% required to pass)
- AI-powered quiz generation
- Free and Pro tiers

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla HTML/CSS/JavaScript (single HTML file) |
| Backend | Vandromeda API (PHP 8.x) |
| Database | MySQL/MariaDB |
| Auth | Firebase Authentication |
| Payments | Stripe |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Testing | Playwright |
| Analytics | Plausible |

### Key Metrics

- **Demo Questions:** 310 across 24 categories
- **Free Tier Limit:** 50 imported questions
- **Pro Storage:** 50MB
- **Mastery Threshold:** 3 correct answers
- **Exam Pass Rate:** 100% required

---

## 2. User Guide

### Getting Started

#### Option 1: Demo Mode (No Account)
1. Visit https://fullstackkevinvandriel.github.io/QuizMyself/
2. Click "Try Demo Quiz"
3. Practice with 310 built-in questions

#### Option 2: Keyword Mode (No Login)
1. Enter a keyword (e.g., "myquiz123")
2. Your progress is saved to this keyword
3. Access from any device using the same keyword

#### Option 3: Full Account
1. Click "Sign Up" and enter email/password
2. Verify email
3. Create multiple quizzes under your account
4. Sync progress across devices

### Quiz Modes

#### Practice Mode
- Questions appear randomly from your pool
- Answer correctly 3 times to "master" a question
- Mastered questions are removed from rotation
- Track progress with visual indicators

#### Final Exam Mode
- All questions in random order
- Must score 100% to pass
- Progress saves after each answer
- Can resume after closing browser

### Importing Questions

#### Supported Formats

**JSON:**
```json
[
  {"question": "What is 2+2?", "answer": "4"},
  {"question": "Capital of France?", "answer": "Paris"}
]
```

**CSV:**
```csv
question,answer
What is 2+2?,4
Capital of France?,Paris
```

**Q&A Text:**
```
Q: What is 2+2?
A: 4

Q: Capital of France?
A: Paris
```

#### Import Methods
1. **Paste:** Copy text directly into import field
2. **File Upload:** Drag and drop or click to upload
3. **URL Scrape:** Enter URL to extract content

### AI Quiz Generation

1. Upload or paste source material
2. Click "Generate Questions"
3. Configure: number of questions, difficulty, focus area
4. Preview generated questions
5. Refine via chat if needed
6. Accept to add to your quiz

**Limits:**
- Free: 3 generations/day, 3 refinements/day
- Pro: Unlimited

### Pro Features

- Unlimited imported questions
- 50MB storage
- Unlimited AI generations
- Priority support

**Pricing:**
- Monthly: $4.99
- Yearly: $29.99 (50% savings)

---

## 3. Architecture

### System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │────▶│  GitHub Pages    │     │   Firebase      │
│   (index.html)  │     │  (Static Host)   │     │   (Auth)        │
└────────┬────────┘     └──────────────────┘     └────────┬────────┘
         │                                                 │
         │ API Calls                                       │ Auth
         ▼                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Vandromeda API                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ feedback.php│  │ progress.php│  │ license.php │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│                   ┌─────────────┐                                │
│                   │   MySQL     │                                │
│                   │  Database   │                                │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
         │
         │ GitHub Actions
         ▼
┌─────────────────┐
│  GitHub Issues  │◀───── Feedback Sync
│  + Roadmap      │
└─────────────────┘
```

### Data Flow

1. **User submits feedback** → Vandromeda DB → GitHub Actions → GitHub Issue
2. **GitHub Issue updated** → GitHub Actions → Vandromeda DB → User notification
3. **Roadmap requested** → Vandromeda API → Live feedback list
4. **Quiz progress** → localStorage (immediate) + Vandromeda API (sync)

### File Structure

```
QuizMyself/
├── index.html              # Main SPA (7,700+ lines)
├── roadmap.json            # Generated from GitHub issues
├── playwright.config.js    # Test configuration
├── package.json            # Dependencies & scripts
├── PLAN.md                 # Development roadmap
│
├── docs/
│   └── DOCUMENTATION.md    # This file
│
├── tests/                  # Playwright tests (79 tests)
│   ├── smoke.spec.js
│   ├── guest-mode.spec.js
│   ├── feedback.spec.js
│   ├── category-filter.spec.js
│   ├── exam-mode.spec.js
│   ├── import.spec.js
│   ├── ai-generation.spec.js
│   ├── link-source.spec.js
│   ├── modal-stacking.spec.js
│   └── roadmap.spec.js
│
├── test-data/              # Test fixtures
│   ├── test-json-simple.json
│   ├── test-csv-simple.csv
│   └── ...
│
├── .github/workflows/      # CI/CD automation
│   ├── playwright.yml
│   ├── deploy.yml
│   ├── update-roadmap.yml
│   ├── sync-feedback.yml
│   └── sync-issue-status.yml
│
└── vandromeda-api/         # Backend reference (deployed separately)
    ├── feedback.php
    ├── feedback-public.php
    ├── feedback-notify.php
    ├── generate-token.php
    ├── .env.example
    └── README.md
```

---

## 4. Frontend Reference

### State Management

```javascript
// Global application state
let state = {
    mastered: [],           // Question IDs answered correctly 3+ times
    answerCounts: {},       // {questionId: correctCount}
    totalCorrect: 0,        // Session stats
    totalAnswered: 0,       // Session stats
    currentQuestion: null,  // Active question object
    currentMode: 'menu',    // menu | practice | exam
    examQuestions: [],      // Shuffled questions for exam
    examIndex: 0,           // Current exam position
    examCorrect: 0,         // Correct in current exam
    claimedKnowledge: false,// User said "I know this"
    isPro: false,           // Pro subscription status
    licenseKey: null,       // Stripe license key
    email: null,            // User email
    importedQuestionCount: 0
};

// Other globals
let currentKeyword = null;      // Active quiz keyword
let selectedCategories = new Set(); // Active category filters
let allCategories = [];         // Available categories
let currentUser = null;         // Firebase user object
let userKeywords = [];          // User's saved keywords
let authToken = null;           // Firebase ID token
```

### Key Functions

#### Navigation & UI
| Function | Description |
|----------|-------------|
| `showScreen(screenId)` | Switch between app screens |
| `backToMenu()` | Return to main menu |
| `toggleHamburgerMenu()` | Open/close hamburger menu |
| `showToast(message, type)` | Show notification toast |
| `showConfirm(title, message, onConfirm)` | Custom confirmation dialog |
| `showSelection(title, items, onSelect)` | Custom selection modal |

#### Quiz Operations
| Function | Description |
|----------|-------------|
| `startPractice()` | Begin practice mode |
| `startFinalExam()` | Begin exam mode |
| `resumeExam()` | Continue saved exam |
| `loadNextQuestion()` | Get next question |
| `selectChoice(index)` | Handle answer selection |
| `recordAnswer(isCorrect)` | Record answer and update stats |
| `markAlwaysKnow()` | Mark question as mastered |

#### Import & Data
| Function | Description |
|----------|-------------|
| `handleImport()` | Process imported data |
| `parseJSON(text)` | Parse JSON format |
| `parseCSV(text)` | Parse CSV format |
| `parseFlashcards(text)` | Parse Q&A text format |
| `detectFormat(text)` | Auto-detect import format |

#### State & Sync
| Function | Description |
|----------|-------------|
| `saveState()` | Save to localStorage + cloud |
| `loadState()` | Load from cloud or localStorage |
| `updateStats()` | Refresh UI statistics |
| `syncProgress()` | Force cloud sync |

#### Authentication
| Function | Description |
|----------|-------------|
| `handleLogin()` | Firebase email/password login |
| `handleRegister()` | Create Firebase account |
| `handleSignOut()` | Logout and clear state |
| `getAuthToken()` | Get Firebase ID token |

### localStorage Keys

```javascript
'quizmyself_keyword'              // Current session keyword
'quizmyself_active_keyword'       // Last used keyword
'quizmyself_welcome_seen'         // Welcome dismissed flag
'quizmyself_license_${keyword}'   // Pro license (keyword users)
'quizmyself_email_${keyword}'     // Email (keyword users)
'quizmyself_state_${keyword}'     // Cached quiz state
'quizmyself_exam_${keyword}'      // Exam progress
```

### CSS Classes

#### Modal System
```css
.modal-overlay           /* Base modal backdrop (z-index: 1000) */
.modal-overlay.modal-top /* Stacking modals (z-index: 1500) */
.modal-content           /* Modal container */
.modal-close             /* Close button */
.hidden                  /* Display: none */
```

#### Components
```css
.hamburger-btn          /* Menu toggle button */
.hamburger-dropdown     /* Dropdown menu */
.menu-item              /* Menu option */
.btn                    /* Base button */
.btn-primary            /* Primary action button */
.btn-secondary          /* Secondary button */
.toast                  /* Notification toast */
.category-chip          /* Category filter chip */
.keyword-item           /* Quiz list item */
.roadmap-item           /* Roadmap entry */
.roadmap-label          /* Issue type badge */
```

---

## 5. Backend API Reference

### Base URL

```
https://www.vandromeda.com/api
```

### Authentication

Most endpoints require Bearer token authentication:

```
Authorization: Bearer <token>
```

Tokens are generated via `generate-token.php` CLI tool.

### Endpoints

#### Feedback API

**Submit Feedback (Public)**
```http
POST /feedback.php
Content-Type: application/json

{
  "product": "quizmyself",
  "type": "bug|feature|question|feedback",
  "message": "Description...",
  "email": "user@example.com",  // optional
  "user_agent": "...",          // optional
  "url": "...",                 // optional
  "context": {}                 // optional
}

Response:
{
  "success": true,
  "message": "Feedback submitted",
  "id": 123
}
```

**Get Public Roadmap (Public)**
```http
GET /feedback.php?product=quizmyself&public=true

Response:
{
  "success": true,
  "feedback": [
    {
      "id": 123,
      "type": "bug",
      "title": "Truncated message...",
      "status": "new",
      "status_label": "Open",
      "github_issue": 456,
      "github_issue_url": "https://github.com/.../issues/456",
      "created_at": "2026-01-18 12:00:00",
      "is_resolved": false
    }
  ],
  "stats": {
    "total": 10,
    "resolved": 3,
    "in_progress": 2,
    "open": 5,
    "bugs": 6,
    "features": 4
  }
}
```

**Get Unprocessed Feedback (Auth Required)**
```http
GET /feedback.php?product=quizmyself&unprocessed=true
Authorization: Bearer <token>

Response:
{
  "success": true,
  "feedback": [/* full feedback objects */]
}
```

**Mark Feedback Processed (Auth Required)**
```http
POST /feedback.php
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "mark_processed",
  "id": 123,
  "github_issue": 456,
  "github_issue_url": "https://github.com/.../issues/456"
}

Response:
{
  "success": true,
  "message": "Feedback marked as processed"
}
```

**Update Feedback Status (Auth Required)**
```http
PATCH /feedback.php
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": 123,
  "status": "resolved|in_progress|wont_fix|duplicate|invalid"
}

Response:
{
  "success": true,
  "message": "Feedback updated"
}
```

#### Quiz Data APIs

**Get Progress**
```http
GET /quizmyself/progress.php?keyword=<keyword>
Authorization: Bearer <firebase_token>  // or keyword auth

Response:
{
  "success": true,
  "data": {
    "mastered": [],
    "answerCounts": {},
    "questions": [],
    "sources": []
  }
}
```

**Save Progress**
```http
POST /quizmyself/progress.php
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "keyword": "myquiz",
  "mastered": [1, 2, 3],
  "answerCounts": {"1": 3, "2": 3},
  "questions": [...]
}

Response:
{
  "success": true
}
```

#### AI Generation APIs

**Check Usage Limits**
```http
POST /quizmyself/usage.php
Authorization: Bearer <token>

{
  "keyword": "myquiz",
  "action": "check"
}

Response:
{
  "success": true,
  "generations_today": 2,
  "generations_limit": 3,
  "refinements_today": 1,
  "refinements_limit": 3,
  "is_pro": false
}
```

**Generate Questions**
```http
POST /quizmyself/generate-questions.php
Authorization: Bearer <token>
Content-Type: application/json

{
  "keyword": "myquiz",
  "source_id": 123,
  "count": 10,
  "difficulty": "medium",
  "focus": "key concepts"
}

Response:
{
  "success": true,
  "questions": [
    {"question": "...", "answer": "..."},
    ...
  ]
}
```

### Error Responses

All endpoints return errors in this format:

```json
{
  "error": true,
  "message": "Description of error"
}
```

HTTP Status Codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `405` - Method not allowed
- `500` - Server error

---

## 6. Database Schema

### feedback

Stores user feedback submissions.

```sql
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    type ENUM('bug', 'feature', 'question', 'feedback') NOT NULL,
    message TEXT NOT NULL,
    email VARCHAR(255),
    user_agent TEXT,
    url VARCHAR(500),
    context JSON,
    ip_address VARCHAR(45),
    status ENUM('new', 'reviewed', 'in_progress', 'resolved', 'wont_fix') DEFAULT 'new',
    github_issue INT,
    github_issue_url VARCHAR(500),
    processed_at DATETIME,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_product (product),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_processed (processed_at)
);
```

### api_tokens

Stores API authentication tokens.

```sql
CREATE TABLE api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100),
    permissions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    last_used_at DATETIME,

    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);
```

**Permission values:**
- `feedback:read` - Read feedback
- `feedback:write` - Create/update feedback
- `feedback:notify` - Send notifications
- `*` - All permissions

### feedback_notifications

Tracks email notifications sent to users.

```sql
CREATE TABLE feedback_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id),
    INDEX idx_feedback_id (feedback_id)
);
```

---

## 7. Authentication

### Firebase Authentication

Used for full account users.

**Setup:**
1. Firebase project configured with email/password auth
2. Client SDK initialized in index.html
3. ID tokens passed to Vandromeda API

**Flow:**
```
1. User enters email/password
2. Firebase validates credentials
3. Firebase returns ID token
4. Token sent with API requests
5. Backend validates token with Firebase Admin SDK
```

### Keyword Authentication

Used for guest/keyword-only users.

**Flow:**
```
1. User enters keyword (e.g., "myquiz123")
2. Keyword stored in localStorage
3. Keyword sent with API requests
4. Backend creates/retrieves user record by keyword
```

### API Token Authentication

Used for automation (GitHub Actions).

**Generation:**
```bash
php generate-token.php \
  --name="GitHub Actions" \
  --permissions="feedback:read,feedback:write" \
  --expires=365
```

**Usage:**
```
Authorization: Bearer <64-char-token>
```

---

## 8. Testing Guide

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with browser visible
npm run test:headed

# Run in UI mode
npm run test:ui

# Run specific test file
npx playwright test tests/feedback.spec.js
```

### Test Structure

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Dismiss welcome screen
        const welcome = page.locator('#welcome-screen');
        if (await welcome.isVisible()) {
            await page.click('button:has-text("Skip intro")');
        }
    });

    test('should do something', async ({ page }) => {
        await page.click('.some-button');
        await expect(page.locator('.result')).toBeVisible();
    });
});
```

### Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| smoke.spec.js | 4 | Page load, welcome, menu |
| guest-mode.spec.js | 3 | Demo quiz without login |
| feedback.spec.js | 4+ | Feedback modal, submission |
| category-filter.spec.js | 4+ | Category toggle, filtering |
| exam-mode.spec.js | 4+ | Exam flow, progress |
| import.spec.js | 10+ | JSON, CSV, Q&A import |
| ai-generation.spec.js | 8+ | AI generation, refinement |
| link-source.spec.js | 10+ | Source-quiz linking |
| modal-stacking.spec.js | 5+ | Z-index, modal behavior |
| roadmap.spec.js | 6+ | Roadmap modal, content |

### Writing Tests

**Best Practices:**
1. Use `test.describe()` to group related tests
2. Use `test.beforeEach()` for common setup
3. Use descriptive test names
4. Mock API responses for reliability
5. Test both success and error paths

**Mocking API:**
```javascript
await page.route('**/api/feedback.php', route => {
    route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 123 })
    });
});
```

---

## 9. CI/CD & Automation

### Workflows Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| playwright.yml | Push, PR | Run tests |
| deploy.yml | Push to main | Deploy to GitHub Pages |
| update-roadmap.yml | Push, issues, daily | Generate roadmap.json |
| sync-feedback.yml | Hourly | Create GitHub issues from feedback |
| sync-issue-status.yml | Issue events | Sync status back to Vandromeda |

### playwright.yml

Runs Playwright tests on every push and PR.

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-screenshots
          path: test-results/
```

### sync-feedback.yml

Syncs Vandromeda feedback to GitHub Issues.

```yaml
on:
  schedule:
    - cron: '15 * * * *'  # Hourly at :15
  workflow_dispatch:

jobs:
  sync:
    steps:
      # 1. Fetch unprocessed feedback from Vandromeda
      # 2. For each: create GitHub issue
      # 3. Mark as processed in Vandromeda
```

### update-roadmap.yml

Generates roadmap.json from GitHub Issues.

```yaml
on:
  push:
    branches: [main]
  issues:
    types: [opened, closed, labeled]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  update:
    steps:
      # 1. Fetch open + recently closed issues
      # 2. Extract feedback_id from body
      # 3. Generate roadmap.json
      # 4. Create PR and auto-merge
```

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | Auto-provided, for GitHub API |
| `VANDROMEDA_API_TOKEN` | Authenticate with Vandromeda API |

---

## 10. Configuration

### playwright.config.js

```javascript
module.exports = {
    testDir: './tests',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8080',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry'
    },
    webServer: {
        command: 'npx serve -l 8080',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI
    }
};
```

### Environment Variables (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vandromeda
DB_USER=username
DB_PASS=password

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=user@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=noreply@vandromeda.com

# Firebase (backend validation)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CREDENTIALS=/path/to/credentials.json
```

---

## 11. Migration Guide

### Adding a New Feature

1. **Frontend:**
   - Add HTML/CSS to index.html
   - Add JavaScript functions
   - Update state management if needed
   - Add localStorage keys if needed

2. **Backend:**
   - Create/update PHP endpoint
   - Add database migrations
   - Update API documentation

3. **Testing:**
   - Add Playwright tests
   - Test locally with `npm test`

4. **Deployment:**
   - Create feature branch
   - Open PR
   - Tests run automatically
   - Merge triggers deployment

### Database Migrations

**Adding a column:**
```sql
ALTER TABLE feedback
ADD COLUMN new_field VARCHAR(100) AFTER existing_field;
```

**Adding an index:**
```sql
CREATE INDEX idx_new_field ON feedback(new_field);
```

**Run migrations:**
```bash
ssh vandromeda "mysql -u user -p database < migration.sql"
```

### API Versioning

Currently no versioning. Future changes should:
1. Maintain backward compatibility
2. Use query params for new behavior (e.g., `?v=2`)
3. Deprecate old behavior gracefully

---

## 12. Security

### Known Vulnerabilities

#### P0 Critical: XSS in onclick Handlers

**Affected:**
```javascript
// Keywords (line ~4522)
onclick="selectKeyword('${kw.keyword}')"

// Categories (similar pattern)
onclick="toggleCategory('${category}')"
```

**Risk:** Malicious imported data can execute JavaScript.

**Fix:** Use event delegation with data attributes:
```javascript
// HTML
<div class="keyword-item" data-keyword="${escapeAttr(kw.keyword)}">

// JS
document.addEventListener('click', e => {
    const item = e.target.closest('[data-keyword]');
    if (item) selectKeyword(item.dataset.keyword);
});
```

### Security Best Practices

1. **Input Validation:** All user input sanitized
2. **SQL Injection:** PDO prepared statements
3. **XSS:** `escapeHtml()` for output (needs improvement)
4. **CORS:** Configured for specific origins
5. **Authentication:** Firebase + custom tokens
6. **HTTPS:** Enforced on all endpoints

### API Token Security

- Tokens stored hashed (recommended: bcrypt)
- Expiration dates enforced
- Permissions scoped per token
- Tokens rotatable without downtime

---

## 13. Troubleshooting

### Common Issues

**"Unauthorized" error on API call**
- Check token is valid and not expired
- Verify Authorization header format: `Bearer <token>`
- Check token has required permissions

**Progress not syncing**
- Check network connectivity
- Verify keyword matches on both devices
- Check localStorage isn't cleared
- Force sync with `syncProgress()`

**Import fails**
- Verify format matches expected structure
- Check for special characters in CSV
- Ensure JSON is valid (use jsonlint.com)
- Check question limit (50 free, unlimited pro)

**Tests failing locally**
- Run `npm install` to update dependencies
- Run `npx playwright install` for browsers
- Check port 8080 is available
- Clear test cache: `npx playwright test --reporter=line`

### Debug Mode

Add to URL: `?debug=true`

Enables:
- Console logging
- State inspection
- Network request logging

### Logs

**Frontend:** Browser console (F12)

**Backend:** PHP error logs
```bash
ssh vandromeda "tail -f /var/log/php-fpm/error.log"
```

**Workflows:** GitHub Actions tab in repository

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| Keyword | Unique identifier for a quiz session |
| Mastered | Question answered correctly 3+ times |
| Source | Uploaded document for AI generation |
| Pro | Paid subscription tier |

### Contact

- **Issues:** https://github.com/FullStackKevinVanDriel/QuizMyself/issues
- **Feedback:** In-app feedback button
- **Email:** info@vandromeda.com

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.2 | Jan 2026 | Live roadmap, feedback sync |
| 0.1.1 | Jan 2026 | AI generation, source linking |
| 0.1.0 | Dec 2025 | Initial release |

---

*Generated: January 2026*
