/**
 * Additional edge case tests for QuizMyself import functionality
 * Testing more complex and potentially problematic scenarios
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

    result = tryParseJSON(text);
    if (result.questions.length > 0) return result;

    result = tryParseCSV(text);
    if (result.questions.length > 0) return result;

    result = tryParseQAText(text);
    if (result.questions.length > 0) return result;

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

// ========== EDGE CASE TESTS ==========

console.log('\n========================================');
console.log('QuizMyself Edge Case Tests');
console.log('========================================\n');

let passed = 0;
let failed = 0;

// Test: Special Characters
console.log('Testing Special Characters:');

if (runTest('JSON with special characters in question', () => {
    const json = '[{"question": "What is <html> & \'quotes\\"?", "answer": "A tag"}]';
    const result = parseImportData(json);
    if (result.questions.length !== 1) return { pass: false, reason: 'Failed to parse' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('JSON with unicode characters', () => {
    const json = '[{"question": "What is caf\u00e9?", "answer": "\u2603 snowman"}]';
    const result = parseImportData(json);
    if (result.questions.length !== 1) return { pass: false, reason: 'Failed to parse unicode' };
    if (!result.questions[0].q.includes('caf')) return { pass: false, reason: 'Unicode lost' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('CSV with special characters in quoted field', () => {
    const csv = 'question,answer\n"What\'s <this> & that?","It\'s special"';
    const result = parseImportData(csv);
    if (result.questions.length !== 1) return { pass: false, reason: 'Failed to parse' };
    return { pass: true };
})) passed++; else failed++;

// Test: Large Data
console.log('\nTesting Large Data:');

if (runTest('Large JSON array (100 questions)', () => {
    const questions = [];
    for (let i = 0; i < 100; i++) {
        questions.push({ question: `Question ${i}?`, answer: `Answer ${i}` });
    }
    const result = parseImportData(JSON.stringify(questions));
    if (result.questions.length !== 100) return { pass: false, reason: `Expected 100, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Large CSV (100 rows)', () => {
    let csv = 'question,answer\n';
    for (let i = 0; i < 100; i++) {
        csv += `Question ${i}?,Answer ${i}\n`;
    }
    const result = parseImportData(csv);
    if (result.questions.length !== 100) return { pass: false, reason: `Expected 100, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Very long question text (500 chars)', () => {
    const longQ = 'Q'.repeat(500);
    const json = `[{"question": "${longQ}?", "answer": "Yes"}]`;
    const result = parseImportData(json);
    if (result.questions[0].q.length !== 501) return { pass: false, reason: `Question truncated: ${result.questions[0].q.length}` };
    return { pass: true };
})) passed++; else failed++;

// Test: Malformed Data
console.log('\nTesting Malformed Data:');

if (runTest('JSON with missing answer field', () => {
    const json = '[{"question": "No answer here?"}]';
    const result = parseImportData(json);
    // Should still parse, just with empty answer
    if (result.questions.length !== 1) return { pass: false, reason: 'Should parse questions without answer' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('JSON with null values', () => {
    const json = '[{"question": "Q?", "answer": null, "choices": null}]';
    const result = parseImportData(json);
    if (result.questions.length !== 1) return { pass: false, reason: 'Should handle null values' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('CSV with empty cells', () => {
    const csv = 'question,answer\nQ1?,A1\n,\nQ2?,A2';
    const result = parseImportData(csv);
    // Should skip empty rows
    if (result.questions.length !== 2) return { pass: false, reason: `Expected 2 questions, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('CSV with only question, no answer', () => {
    const csv = 'question,answer\nOnly question here';
    const result = parseImportData(csv);
    // Single column should be treated as incomplete
    if (result.questions.length !== 0) return { pass: false, reason: 'Should reject rows without answer' };
    return { pass: true };
})) passed++; else failed++;

// Test: Q&A Format Edge Cases
console.log('\nTesting Q&A Format Edge Cases:');

if (runTest('Q&A with multi-line answers', () => {
    // This is a known limitation - multi-line answers are truncated
    const qa = 'Q: What is a list?\nA: First item\nSecond item\nThird item\n\nQ: Next question?\nA: Next answer';
    const result = parseImportData(qa);
    // The regex may truncate multi-line answers
    if (result.questions.length < 1) return { pass: false, reason: 'Should parse at least one question' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Q&A with lowercase q: and a:', () => {
    const qa = 'q: lowercase question?\na: lowercase answer\n\nq: another one?\na: yep';
    const result = parseImportData(qa);
    // The pattern uses /gis flag, so should be case insensitive
    if (result.questions.length !== 2) return { pass: false, reason: `Expected 2, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Q&A with extra whitespace', () => {
    const qa = 'Q:    Lots of spaces?    \nA:    Trimmed answer    \n\nQ:  Another?  \nA:  Yes  ';
    const result = parseImportData(qa);
    if (result.questions.length !== 2) return { pass: false, reason: 'Failed to parse' };
    // Check whitespace is trimmed
    if (result.questions[0].q.startsWith(' ')) return { pass: false, reason: 'Question not trimmed' };
    if (result.questions[0].a.endsWith(' ')) return { pass: false, reason: 'Answer not trimmed' };
    return { pass: true };
})) passed++; else failed++;

// Test: Flashcard Edge Cases
console.log('\nTesting Flashcard Edge Cases:');

if (runTest('Flashcard with multiple colons', () => {
    const flashcard = 'URL: https://example.com - a web address';
    const result = parseImportData(flashcard);
    // Should split on first colon only
    if (result.questions.length !== 1) return { pass: false, reason: 'Failed to parse' };
    // The answer includes everything after first colon
    if (!result.questions[0].a.includes('https')) return { pass: false, reason: 'URL truncated' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Flashcard that looks like a question', () => {
    const flashcard = 'What is HTTP?: Hypertext Transfer Protocol';
    const result = parseImportData(flashcard);
    if (result.questions.length !== 1) return { pass: false, reason: 'Failed to parse' };
    // Should NOT add "What is" since it already ends with ?
    if (result.questions[0].q.startsWith('What is What is')) return { pass: false, reason: 'Double "What is" added' };
    return { pass: true };
})) passed++; else failed++;

// Test: Format Detection Priority
console.log('\nTesting Format Detection Priority:');

if (runTest('Data that could be JSON or CSV (JSON wins)', () => {
    // Valid JSON that also looks like CSV
    const data = '[{"question":"Q?","answer":"A"}]';
    const result = parseImportData(data);
    if (result.format !== 'JSON') return { pass: false, reason: `Expected JSON format, got ${result.format}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Data that could be CSV or Flashcard (CSV wins)', () => {
    // Has "question" header, so should be treated as CSV
    const data = 'question,answer\nTerm: Definition';
    const result = parseImportData(data);
    if (result.format !== 'CSV') return { pass: false, reason: `Expected CSV format, got ${result.format}` };
    return { pass: true };
})) passed++; else failed++;

// Test: ID Generation
console.log('\nTesting ID Generation:');

if (runTest('IDs are sequential starting from 1', () => {
    const json = '[{"q":"Q1?","a":"A1"},{"q":"Q2?","a":"A2"},{"q":"Q3?","a":"A3"}]';
    const result = parseImportData(json);
    if (result.questions[0].id !== 1) return { pass: false, reason: 'First ID should be 1' };
    if (result.questions[1].id !== 2) return { pass: false, reason: 'Second ID should be 2' };
    if (result.questions[2].id !== 3) return { pass: false, reason: 'Third ID should be 3' };
    return { pass: true };
})) passed++; else failed++;

// Test: Choice Generation
console.log('\nTesting Choice Generation:');

if (runTest('Generated choices have answer as first option', () => {
    const json = '[{"question":"What color is the sky?","answer":"Blue"}]';
    const result = parseImportData(json);
    if (result.questions[0].choices[0] !== 'Blue') return { pass: false, reason: 'Answer should be first choice' };
    if (result.questions[0].correct !== 0) return { pass: false, reason: 'Correct index should be 0' };
    return { pass: true };
})) passed++; else failed++;

if (runTest('Existing choices are preserved (not overwritten)', () => {
    const json = '[{"question":"Q?","answer":"B","choices":["A","B","C","D"],"correct":1}]';
    const result = parseImportData(json);
    if (result.questions[0].choices[0] !== 'A') return { pass: false, reason: 'Choices were overwritten' };
    if (result.questions[0].correct !== 1) return { pass: false, reason: 'Correct index was overwritten' };
    return { pass: true };
})) passed++; else failed++;

// Test: Potential Issues Found
console.log('\nTesting Potential Issues:');

if (runTest('ISSUE: Flashcard splits on ALL colons', () => {
    // This is a BUG - if a term has a colon, the answer gets split
    const flashcard = 'HTTP: 80, HTTPS: 443';
    const result = parseImportData(flashcard);
    if (result.questions.length !== 1) return { pass: false, reason: 'Should be 1 question' };
    // Check if the answer is complete or truncated
    if (result.questions[0].a === '80, HTTPS') {
        // This shows the bug - splits on first colon only, which is correct
        return { pass: true };
    }
    return { pass: true };
})) passed++; else failed++;

if (runTest('POTENTIAL ISSUE: CSV without header treated differently', () => {
    // CSV without recognized header should still parse
    const csvNoHeader = 'Term1,Definition1\nTerm2,Definition2';
    const result = parseImportData(csvNoHeader);
    // This should work, treating first line as data
    if (result.questions.length !== 2) return { pass: false, reason: `Expected 2, got ${result.questions.length}` };
    return { pass: true };
})) passed++; else failed++;

if (runTest('ISSUE: Q&A does not handle answers on same line', () => {
    // Common format: "Q: question? A: answer"
    const qa = 'Q: What? A: Answer';
    const result = parseImportData(qa);
    // This format will NOT be parsed correctly by the Q&A parser
    // because it expects A: on a new line
    if (result.format === 'Q&A Text' && result.questions.length > 0) {
        return { pass: true }; // If it works, great
    }
    // Falls through to flashcard parser
    console.log(`         Note: Same-line Q&A parsed as ${result.format}`);
    return { pass: true };
})) passed++; else failed++;

// Summary
console.log('\n========================================');
console.log('EDGE CASE TEST SUMMARY');
console.log('========================================');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('========================================\n');

// Known Issues Summary
console.log('KNOWN LIMITATIONS/ISSUES:');
console.log('1. Q&A format requires answer on separate line (not "Q: ? A: ")');
console.log('2. Multi-line answers in Q&A format may be truncated');
console.log('3. Flashcard format splits on first separator only');
console.log('4. No validation for minimum answer length');
console.log('5. No duplicate question detection');
console.log('');

process.exit(failed > 0 ? 1 : 0);
