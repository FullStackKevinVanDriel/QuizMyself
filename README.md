# QuizMyself

A flexible quiz tool where you can import your own study material and test yourself. Features cloud sync, progress tracking, and optional Pro features.

## Features

- **Import your own quizzes** - Drag & drop files (CSV, JSON, text) or paste directly
- **Multiple formats supported** - Q&A pairs, flashcards, CSV, JSON
- **Progress tracking** - Synced across devices via cloud storage
- **Practice mode** - Spaced repetition, master questions by answering correctly 3 times
- **Final exam mode** - 100% required to pass, progress saves after each question
- **Resume exams** - Continue where you left off, even across devices
- **User accounts** - Sign in with Google/GitHub via Firebase authentication
- **Pro features** - Unlimited imports, cloud sync, priority support

## Live Demo

https://fullstackkevinvandriel.github.io/QuizMyself/

## How It Works

### Getting Started

1. Sign in with Google or GitHub (optional, for cloud sync)
2. Enter a keyword to organize your quizzes
3. Import quiz data or use built-in questions
4. Start practicing!

### Import Formats

**JSON:**
```json
[
  {"question": "What is 2+2?", "answer": "4"},
  {"question": "Capital of France?", "answer": "Paris"}
]
```

**CSV:**
```
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

### Practice Mode

- Questions appear randomly from your unmastered pool
- Answer correctly 3 times to master a question
- Mastered questions are removed from rotation
- Progress syncs automatically if signed in

### Final Exam

- All questions in random order
- Must score 100% to pass
- Progress saves after each answer
- Resume anytime with the "Resume Exam" button

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Authentication**: Firebase (Google, GitHub OAuth)
- **Storage**: Cloudflare Workers KV
- **Payments**: Stripe via Vandromeda API
- **Hosting**: GitHub Pages

## Project Structure

```
QuizMyself/
├── index.html           # Main quiz application
├── course-content.html  # Study content viewer
├── worker/              # Cloudflare Worker for cloud sync
└── .github/workflows/   # CI/CD deployment
```

## Development

To run locally, simply open `index.html` in a browser. The app works offline but cloud sync features require the Cloudflare Worker backend.

## License

MIT
