# QuizMyself

A flexible quiz tool where you can import your own study material and test yourself.

## Features

- **Import your own quizzes** - Drag & drop files (CSV, JSON, text) or paste directly
- **Multiple formats supported** - Q&A pairs, flashcards, CSV, JSON
- **Progress tracking** - Synced across devices via cloud storage
- **Source material storage** - View and manage your imported source files
- **Practice mode** - Spaced repetition, master questions by answering correctly
- **Final exam mode** - 100% required to pass
- **Demo quizzes** - Try out with built-in demo questions across multiple categories
- **Pro features** - Unlimited imports, 50MB storage

## Live Demo

https://fullstackkevinvandriel.github.io/QuizMyself/

## How It Works

### Getting Started

1. Enter a keyword to save your progress (or try the demo)
2. Import quiz data or use the built-in demo questions
3. Start practicing!

### Demo Categories

Try the app with demo questions in these categories:
- US Presidents
- World Capitals
- Basic Math
- Science Facts
- Programming
- Language & Vocabulary
- History

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

### Final Exam

- All questions in random order
- Must score 100% to pass
- Progress saves after each answer

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Vandromeda API (MySQL)
- **Auth**: Firebase Authentication
- **Payments**: Stripe via Vandromeda API
- **Hosting**: GitHub Pages

## License

MIT
