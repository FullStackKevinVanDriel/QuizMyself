# QuizMyself

A flexible quiz tool where you can import your own study material, generate AI-powered quizzes, and test yourself with spaced repetition.

## Live Demo

https://fullstackkevinvandriel.github.io/QuizMyself/

## Features

### Core Features
- **Import your own quizzes** - Drag & drop files (CSV, JSON, text) or paste directly
- **Multiple formats supported** - Q&A pairs, flashcards, CSV, JSON
- **Progress tracking** - Synced across devices via cloud storage
- **Practice mode** - Spaced repetition, master questions after 3 correct answers
- **Final exam mode** - 100% required to pass
- **Demo quizzes** - 310+ questions across 24 categories to try without login

### AI-Powered Features
- **Generate quizzes from source material** - Upload a PDF, document, or text and let AI create questions
- **Chat refinement** - Iterate on generated questions with natural language ("make harder", "focus on chapter 2")
- **View in Source** - Click to see the original source context for any question
- **Smart generation controls** - Set question count, difficulty level, and focus area

### Pro Tier
- **Unlimited question imports** - Free tier: 50 questions max
- **Extended AI generation** - 100 generations/month vs 3/day for free
- **Cloud sync** - Progress synced across all devices
- **50MB source storage** - Store PDFs and documents for quiz generation
- **Priority support** - Direct access to help

## How It Works

### Getting Started

1. **Sign in** with Google or create an account
2. **Upload source material** (PDF, text, HTML) OR import existing quiz data
3. **Generate questions** with AI or use your imported data
4. **Practice** with spaced repetition until mastery

### AI Quiz Generation

1. Upload or select source material from Quiz Data menu
2. Click **"Generate Quiz"** on any source
3. Configure options:
   - Question count (5, 10, 15, or 20)
   - Difficulty (Easy, Medium, Hard)
   - Focus area (optional - e.g., "security concepts")
4. Preview generated questions
5. **Refine with chat** if needed:
   - "Make these questions harder"
   - "Add more questions about authentication"
   - "Focus on practical examples"
6. Accept and add to your quiz

### Import Formats

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

### Practice Mode

- Questions appear randomly from your unmastered pool
- Answer correctly **3 times** to master a question
- Mastered questions are removed from rotation
- View source material context when you get answers wrong

### Final Exam

- All questions in random order
- Must score **100%** to pass
- Progress saves after each answer
- Resume anytime if interrupted

## Free vs Pro

| Feature | Free | Pro |
|---------|------|-----|
| Demo quizzes | Unlimited | Unlimited |
| Import questions | 50 max | Unlimited |
| AI generations | 3/day | 100/month |
| AI refinements | 3/day | Unlimited |
| Source storage | 10MB | 50MB |
| Cloud sync | - | Yes |
| Price | $0 | $4.99/mo |

## Demo Categories

Try the app without an account using demo questions in:

- Pop Culture, Politics, History, Art
- Music, Movies, Current Events
- US Presidents, World Capitals
- Basic Math, Science Facts
- Programming, Language & Vocabulary
- And 12 more categories...

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (single-file SPA)
- **Backend**: Vandromeda API (PHP/MySQL)
- **AI**: OpenAI GPT-4o-mini for question generation
- **Auth**: Firebase Authentication
- **Payments**: Stripe
- **Hosting**: GitHub Pages

## Development

```bash
# Clone the repo
git clone https://github.com/FullStackKevinVanDriel/QuizMyself.git

# Serve locally
npx serve

# Run tests
npx playwright test
```

## License

MIT
