/**
 * Test script for QuizMyself import functionality
 * This extracts and tests the parsing logic from index.html
 */

const fs = require('fs');
const path = require('path');

// ========== PARSING FUNCTIONS (extracted from index.html) ==========

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function generateChoices(answer) {
    return [
        answer,
        'Alternative answer 1',
        'Alternative answer 2',
        'Alternative answer 3'
    ];
}

function normalizeQuestion(item, idx) {
    const q = item.q || item.question || item.Q || item.Question;
    const a = item.a || item.answer || item.A || item.Answer;

    if (!q) return null;

    let choices = item.choices || item.options || item.Options;
    let correct = item.correct ?? item.correctIndex ?? item.answer_index ?? 0;

    if (!choices || !Array.isArray(choices) || choices.length < 2) {
        choices = generateChoices(a || '');
        correct = 0;
    }

    return {
        id: idx + 1,
        category: item.category || item.Category || 'Imported',
        q: q,
        a: a || choices[correct] || '',
        choices: choices,
        correct: correct
    };
}

function tryParseJSON(text) {
    try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [data];
        const questions = arr.map((item, idx) => normalizeQuestion(item, idx)).filter(q => q !== null);
        return { questions, format: 'JSON' };
    } catch (e) {
        return { questions: [], format: 'Unknown' };
    }
}

function tryParseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return { questions: [], format: 'Unknown' };

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('question') || firstLine.includes('q,') || firstLine.includes('"q"');

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const questions = [];

    for (let i = 0; i < dataLines.length; i++) {
        const parsed = parseCSVLine(dataLines[i]);
        if (parsed.length >= 2) {
            const q = {
                id: questions.length + 1,
                category: 'Imported',
                q: parsed[0],
                a: parsed[1],
                choices: parsed.length >= 6 ? [parsed[2], parsed[3], parsed[4], parsed[5]] : generateChoices(parsed[1]),
                correct: parsed.length >= 7 ? parseInt(parsed[6]) || 0 : 0
            };
            questions.push(q);
        }
    }

    return { questions, format: questions.length > 0 ? 'CSV' : 'Unknown' };
}

function tryParseQAText(text) {
    const questions = [];
    const qaPattern = /Q:\s*(.+?)[\n\r]+A:\s*(.+?)(?=[\n\r]+Q:|$)/gis;
    let match;

    while ((match = qaPattern.exec(text)) !== null) {
        const q = {
            id: questions.length + 1,
            category: 'Imported',
            q: match[1].trim(),
            a: match[2].trim(),
            choices: generateChoices(match[2].trim()),
            correct: 0
        };
        questions.push(q);
    }

    return { questions, format: questions.length > 0 ? 'Q&A Text' : 'Unknown' };
}

function tryParseFlashcards(text) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    for (const line of lines) {
        let parts = null;
        if (line.includes(':')) {
            parts = line.split(':').map(p => p.trim());
        } else if (line.includes(' - ')) {
            parts = line.split(' - ').map(p => p.trim());
        } else if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim());
        }

        if (parts && parts.length >= 2 && parts[0] && parts[1]) {
            const q = {
                id: questions.length + 1,
                category: 'Imported',
                q: parts[0].endsWith('?') ? parts[0] : `What is ${parts[0]}?`,
                a: parts[1],
                choices: generateChoices(parts[1]),
                correct: 0
            };
            questions.push(q);
        }
    }

    return { questions, format: questions.length > 0 ? 'Flashcards' : 'Unknown' };
}

function parseImportData(text) {
    if (!text || !text.trim()) {
        return { questions: [], format: 'Unknown', error: 'Empty input' };
    }

    text = text.trim();
    let result = { questions: [], format: 'Unknown' };

    // Try JSON first
    result = tryParseJSON(text);
    if (result.questions.length > 0) return result;

    // Try CSV
    result = tryParseCSV(text);
    if (result.questions.length > 0) return result;

    // Try Q&A text format
    result = tryParseQAText(text);
    if (result.questions.length > 0) return result;

    // Try flashcards
    result = tryParseFlashcards(text);
    return result;
}

// ========== TEST RUNNER ==========

function runTest(name, testFn) {
    try {
        const result = testFn();
        if (result.pass) {
            console.log(`  [PASS] ${name}`);
            return true;
        } else {
            console.log(`  [FAIL] ${name}`);
            console.log(`         Reason: ${result.reason}`);
            if (result.details) {
                console.log(`         Details: ${JSON.stringify(result.details, null, 2).split('\n').join('\n         ')}`);
            }
            return false;
        }
    } catch (error) {
        console.log(`  [ERROR] ${name}`);
        console.log(`          ${error.message}`);
        return false;
    }
}

// ========== TESTS ==========

console.log('\n========================================');
console.log('QuizMyself Import Feature Test Suite');
console.log('========================================\n');

let passed = 0;
let failed = 0;

// Test 1: JSON Simple Format
console.log('Testing JSON Simple Format:');
const jsonSimple = fs.readFileSync(path.join(__dirname, 'test-json-simple.json'), 'utf8');
if (runTest('Parses simple JSON array', () => {
    const result = parseImportData(jsonSimple);
    if (result.format !== 'JSON') return { pass: false, reason: `Expected format 'JSON', got '${result.format}'` };
    if (result.questions.length !== 5) return { pass: false, reason: `Expected 5 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Extracts question text correctly', () => {
    const result = parseImportData(jsonSimple);
    const q1 = result.questions[0];
    if (q1.q !== 'What is the capital of France?') return { pass: false, reason: 'Question text mismatch' };
    if (q1.a !== 'Paris') return { pass: false, reason: 'Answer text mismatch' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Generates choices when not provided', () => {
    const result = parseImportData(jsonSimple);
    const q1 = result.questions[0];
    if (!q1.choices || q1.choices.length !== 4) return { pass: false, reason: 'Should generate 4 choices' };
    if (q1.choices[0] !== 'Paris') return { pass: false, reason: 'First choice should be the answer' };
    return { pass: true };
})) passed++; else failed++;

// Test 2: JSON with Choices
console.log('\nTesting JSON with Choices:');
const jsonChoices = fs.readFileSync(path.join(__dirname, 'test-json-with-choices.json'), 'utf8');
if (runTest('Parses JSON with choices', () => {
    const result = parseImportData(jsonChoices);
    if (result.questions.length !== 3) return { pass: false, reason: `Expected 3 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Preserves custom choices', () => {
    const result = parseImportData(jsonChoices);
    const q1 = result.questions[0];
    if (q1.choices[0] !== 'Jupiter') return { pass: false, reason: 'Choice preservation failed', details: q1.choices };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Preserves correct answer index', () => {
    const result = parseImportData(jsonChoices);
    const q2 = result.questions[1]; // Carbon question, correct is 1
    if (q2.correct !== 1) return { pass: false, reason: `Expected correct=1, got ${q2.correct}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Preserves category', () => {
    const result = parseImportData(jsonChoices);
    const q1 = result.questions[0];
    if (q1.category !== 'Astronomy') return { pass: false, reason: `Expected category 'Astronomy', got '${q1.category}'` };
    return { pass: true };
})) passed++; else failed++;

// Test 3: CSV Simple Format
console.log('\nTesting CSV Simple Format:');
const csvSimple = fs.readFileSync(path.join(__dirname, 'test-csv-simple.csv'), 'utf8');
if (runTest('Parses CSV with header', () => {
    const result = parseImportData(csvSimple);
    if (result.format !== 'CSV') return { pass: false, reason: `Expected format 'CSV', got '${result.format}'` };
    if (result.questions.length !== 5) return { pass: false, reason: `Expected 5 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Skips header row', () => {
    const result = parseImportData(csvSimple);
    const q1 = result.questions[0];
    if (q1.q === 'question') return { pass: false, reason: 'Header row was not skipped' };
    if (q1.q !== 'What is the speed of light?') return { pass: false, reason: `Wrong first question: ${q1.q}` };
    return { pass: true };
})) passed++; else failed++;

// Test 4: CSV with Choices
console.log('\nTesting CSV with Choices:');
const csvChoices = fs.readFileSync(path.join(__dirname, 'test-csv-with-choices.csv'), 'utf8');
if (runTest('Parses CSV with choices columns', () => {
    const result = parseImportData(csvChoices);
    if (result.questions.length !== 3) return { pass: false, reason: `Expected 3 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Extracts choices from CSV columns', () => {
    const result = parseImportData(csvChoices);
    const q1 = result.questions[0];
    // CSV format: question,answer,choice1,choice2,choice3,choice4,correct
    if (q1.choices.length !== 4) return { pass: false, reason: `Expected 4 choices, got ${q1.choices.length}`, details: q1.choices };
    return { pass: true };
})) passed++; else failed++;

// Test 5: Q&A Text Format
console.log('\nTesting Q&A Text Format:');
const qaText = fs.readFileSync(path.join(__dirname, 'test-qa-text.txt'), 'utf8');
if (runTest('Parses Q&A text format', () => {
    const result = parseImportData(qaText);
    if (result.format !== 'Q&A Text') return { pass: false, reason: `Expected format 'Q&A Text', got '${result.format}'` };
    if (result.questions.length !== 5) return { pass: false, reason: `Expected 5 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Extracts Q&A pairs correctly', () => {
    const result = parseImportData(qaText);
    const q1 = result.questions[0];
    if (q1.q !== 'What is the largest mammal on Earth?') return { pass: false, reason: `Question mismatch: ${q1.q}` };
    if (q1.a !== 'Blue Whale') return { pass: false, reason: `Answer mismatch: ${q1.a}` };
    return { pass: true };
})) passed++; else failed++;

// Test 6: Flashcard Format
console.log('\nTesting Flashcard Format:');
const flashcards = fs.readFileSync(path.join(__dirname, 'test-flashcards.txt'), 'utf8');
if (runTest('Parses flashcard format with colon separator', () => {
    const result = parseImportData(flashcards);
    if (result.format !== 'Flashcards') return { pass: false, reason: `Expected format 'Flashcards', got '${result.format}'` };
    if (result.questions.length !== 5) return { pass: false, reason: `Expected 5 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Generates question from term', () => {
    const result = parseImportData(flashcards);
    const q1 = result.questions[0];
    if (!q1.q.includes('CPU')) return { pass: false, reason: `Question should contain term: ${q1.q}` };
    return { pass: true };
})) passed++; else failed++;

// Test 7: Edge Cases
console.log('\nTesting Edge Cases:');
if (runTest('Handles empty input', () => {
    const result = parseImportData('');
    if (result.questions.length !== 0) return { pass: false, reason: 'Should return empty array for empty input' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Handles whitespace-only input', () => {
    const result = parseImportData('   \n\n   ');
    if (result.questions.length !== 0) return { pass: false, reason: 'Should return empty array for whitespace input' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Handles invalid JSON gracefully', () => {
    const result = parseImportData('{invalid json}');
    // Should try other formats and return Unknown if nothing works
    if (result.format === 'JSON') return { pass: false, reason: 'Should not parse invalid JSON as JSON format' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Handles single question JSON', () => {
    const result = parseImportData('{"question": "Single question?", "answer": "Single answer"}');
    if (result.questions.length !== 1) return { pass: false, reason: `Expected 1 question, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

// Test 8: Alternative Field Names
console.log('\nTesting Alternative Field Names:');
if (runTest('Handles "q" and "a" field names', () => {
    const result = parseImportData('[{"q": "Question?", "a": "Answer"}]');
    if (result.questions.length !== 1) return { pass: false, reason: 'Should parse q/a fields' };
    if (result.questions[0].q !== 'Question?') return { pass: false, reason: 'Question not extracted' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Handles "Q" and "A" (uppercase) field names', () => {
    const result = parseImportData('[{"Q": "Question?", "A": "Answer"}]');
    if (result.questions.length !== 1) return { pass: false, reason: 'Should parse Q/A fields' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Handles "options" as alternative to "choices"', () => {
    const result = parseImportData('[{"question": "Q?", "answer": "A", "options": ["A", "B", "C", "D"]}]');
    const q = result.questions[0];
    if (q.choices[0] !== 'A' || q.choices[3] !== 'D') return { pass: false, reason: 'Options not mapped to choices' };
    return { pass: true };
})) passed++; else failed++;

// Test 9: CSV Quote Handling
console.log('\nTesting CSV Quote Handling:');
if (runTest('Handles quoted CSV fields with commas', () => {
    const csvWithQuotes = 'question,answer\n"What is 1, 2, and 3?","Numbers"';
    const result = parseImportData(csvWithQuotes);
    if (result.questions.length !== 1) return { pass: false, reason: `Expected 1 question, got ${result.questions.length}` };
    if (result.questions[0].q !== 'What is 1, 2, and 3?') return { pass: false, reason: `Quote handling failed: ${result.questions[0].q}` };
    return { pass: true };
})) passed++; else failed++;

// Test 10: Mixed Content Scenarios
console.log('\nTesting Real-World Scenarios:');
if (runTest('Parses tab-separated flashcards', () => {
    const tabSeparated = 'Term1\tDefinition 1\nTerm2\tDefinition 2';
    const result = parseImportData(tabSeparated);
    if (result.questions.length !== 2) return { pass: false, reason: `Expected 2 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Parses dash-separated flashcards', () => {
    const dashSeparated = 'Term1 - Definition 1\nTerm2 - Definition 2';
    const result = parseImportData(dashSeparated);
    if (result.questions.length !== 2) return { pass: false, reason: `Expected 2 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

// Summary
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('========================================\n');

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
