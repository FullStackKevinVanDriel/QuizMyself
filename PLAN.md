# WGU D322 Quiz App - Development Plan

## Project Overview

A study tool for WGU's Introduction to IT course (D322) featuring:
- 138 lessons of course content
- 220 quiz questions with progress tracking
- Cloud sync via Cloudflare Workers + KV storage
- Deployed to GitHub Pages

## Current Architecture

```
quizlet/
├── index.html          # Course content (138 lessons)
├── quiz.html           # Interactive quiz (220 questions)
├── worker/
│   ├── worker.js       # Cloudflare Worker for progress sync
│   └── wrangler.toml   # Worker configuration
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages deployment
```

## Recently Implemented

### Exam Persistence (Jan 2026)
- [x] Exam progress now saves after each question answered
- [x] "Resume Exam" button appears when an in-progress exam exists
- [x] Exam state includes: question order, current index, correct count
- [x] Exam progress clears automatically when exam completes
- [x] Works across browser refreshes and device switches

## Potential Improvements

### High Priority
- [ ] Add flashcard mode for term memorization
- [ ] Implement spaced repetition algorithm for quiz questions
- [ ] Add search functionality across lessons
- [ ] Create progress dashboard showing completion percentage

### Medium Priority
- [ ] Add dark/light theme toggle
- [ ] Export progress to PDF/printable format
- [ ] Add bookmarking for specific lessons
- [ ] Implement quiz filtering by topic/category

### Low Priority
- [ ] Add mobile app wrapper (PWA)
- [ ] Create study timer/Pomodoro feature
- [ ] Add social sharing of quiz scores
- [ ] Implement offline mode with service worker

## Technical Debt
- [ ] Consider migrating to a proper framework (React/Vue/Svelte)
- [ ] Add unit tests for worker logic
- [ ] Implement proper error handling and logging

## Notes
- Quiz hosted at: https://fullstackkevinvandriel.github.io/quizlet/quiz.html
- Worker allows progress sync across devices using keywords
