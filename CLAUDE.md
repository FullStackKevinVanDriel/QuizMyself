# QuizMyself

Self-study quiz tool with custom quiz imports and progress tracking.

## Key Commands

```bash
# Deploy worker changes
cd worker && npx wrangler deploy
```

## Important Files

- `index.html` - Main quiz application (single HTML file)
- `course-content.html` - Course content page
- `worker/` - Cloudflare Workers for storage
- `PLAN.md` - Development plan

## Live Site

https://fullstackkevinvandriel.github.io/QuizMyself/

## Tech Stack

- Frontend: Vanilla HTML/CSS/JavaScript
- Storage: Cloudflare Workers KV
- Payments: Stripe via Vandromeda API
- Hosting: GitHub Pages

## Features

- Import quizzes (CSV, JSON, Q&A text)
- Progress tracking synced across devices
- Practice mode with spaced repetition
- Final exam mode (100% required to pass)
