#!/usr/bin/env python3
"""Scrape all participation activities from zyBooks C949 course and format for QuizMyself."""

import json
import time
import re
import requests
import sys

AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzAzNTE2NTUsInVzZXJfaWQiOjI1NDAwMjN9.smDFWUptgEu2Ggv8Oza3bwo6ANfjScJc9YiBf71RfX4"
ZYBOOK_ID = "WGUC949DataStructuresv4"
BASE_URL = "https://zyserver.zybooks.com/v1"
BASE_URL2 = "https://zyserver2.zybooks.com/v1"

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "User-Agent": "Mozilla/5.0"
}

def strip_html(text):
    """Remove HTML tags from text."""
    if text is None:
        return ''
    if not isinstance(text, str):
        return str(text)
    clean = re.sub(r'<[^>]+>', '', text)
    clean = clean.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#39;', "'")
    return clean.strip()

def extract_text(text_list):
    """Extract text from zyBooks text attribute list."""
    if not text_list:
        return ""
    if isinstance(text_list, str):
        return strip_html(text_list)
    parts = []
    for item in text_list:
        if isinstance(item, dict):
            t = item.get('text', '')
            if t is not None:
                parts.append(strip_html(t))
        elif isinstance(item, str):
            parts.append(strip_html(item))
        elif item is not None:
            parts.append(str(item))
    return ' '.join(parts).strip()

def get_ordering():
    """Get the full chapter/section ordering."""
    url = f"{BASE_URL2}/zybook/{ZYBOOK_ID}/ordering?include=%5B%22content_ordering%22%5D"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    return data['ordering']['content_ordering']['chapters']

def get_section_content(chapter_num, section_num):
    """Get content resources for a specific section."""
    url = f"{BASE_URL}/zybook/{ZYBOOK_ID}/chapter/{chapter_num}/section/{section_num}"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code != 200:
        print(f"  Error fetching {chapter_num}.{section_num}: {resp.status_code}")
        return None
    return resp.json()

def process_multiple_choice(cr, chapter_num, chapter_title, section_num, section_title):
    """Process a multiple choice content resource into quiz questions."""
    questions = []
    payload = cr.get('payload', {})
    
    for q in payload.get('questions', []):
        question_text = extract_text(q.get('text', []))
        if not question_text:
            continue
        
        choices = q.get('choices', [])
        if not choices:
            continue
        
        answers = []
        correct_answer = None
        labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        
        for i, choice in enumerate(choices):
            label_text = choice.get('label', '')
            if isinstance(label_text, list):
                label_text = extract_text(label_text)
            elif label_text is None:
                label_text = ''
            label_text = strip_html(str(label_text)) if not isinstance(label_text, str) else strip_html(label_text)
            answer = f"{labels[i]}) {label_text}" if i < len(labels) else label_text
            answers.append(answer)
            if choice.get('correct', False):
                correct_answer = answer
        
        if correct_answer and len(answers) >= 2:
            questions.append({
                "question": question_text,
                "answers": answers,
                "correctAnswer": correct_answer,
                "category": f"C949 - Chapter {chapter_num}: {chapter_title}"
            })
    
    return questions

def process_short_answer(cr, chapter_num, chapter_title, section_num, section_title):
    """Process a short answer content resource into quiz questions."""
    questions = []
    payload = cr.get('payload', {})
    
    for q in payload.get('questions', []):
        question_text = extract_text(q.get('text', []))
        if not question_text:
            continue
        
        answers = q.get('answers', [])
        if not answers:
            continue
        
        correct = answers[0] if answers else ''
        
        # Convert short answer to multiple-choice by creating plausible wrong answers
        # Skip these - they're fill-in-the-blank, not ideal for MC quizzes
        # We'll include them as "type it" questions
        questions.append({
            "question": f"{question_text} (Type your answer)",
            "answers": [f"A) {correct}"],
            "correctAnswer": f"A) {correct}",
            "category": f"C949 - Chapter {chapter_num}: {chapter_title}",
            "_type": "short_answer"
        })
    
    return questions

def main():
    sys.stdout.reconfigure(line_buffering=True)
    print("Fetching chapter ordering...")
    chapters = get_ordering()
    print(f"Found {len(chapters)} chapters")
    
    all_questions = []
    stats = {}
    
    for ch in chapters:
        ch_num = ch['number']
        ch_title = ch['title']
        sections = ch.get('sections', [])
        ch_questions = 0
        
        print(f"\nChapter {ch_num}: {ch_title} ({len(sections)} sections)")
        
        for sec in sections:
            sec_num = sec['number']
            sec_title = sec.get('title', '')
            
            # Skip hidden sections
            if sec.get('hidden', False):
                continue
            
            print(f"  Section {ch_num}.{sec_num}: {sec_title}...", end=' ')
            
            data = get_section_content(ch_num, sec_num)
            if not data or not data.get('success'):
                print("FAILED")
                continue
            
            section_questions = 0
            for cr in data.get('section', {}).get('content_resources', []):
                cr_type = cr.get('type', '')
                
                if cr_type == 'multiple_choice':
                    qs = process_multiple_choice(cr, ch_num, ch_title, sec_num, sec_title)
                    # Only include true multiple choice (not short answer)
                    all_questions.extend(qs)
                    section_questions += len(qs)
                # Skip short_answer for now - they don't work well as MC quizzes
            
            print(f"{section_questions} questions")
            ch_questions += section_questions
            
            # Rate limit
            time.sleep(0.3)
        
        stats[f"Chapter {ch_num}: {ch_title}"] = ch_questions
        print(f"  Chapter {ch_num} total: {ch_questions} questions")
    
    # Remove the _type field from short answer questions
    for q in all_questions:
        q.pop('_type', None)
    
    print(f"\n{'='*60}")
    print(f"TOTAL: {len(all_questions)} questions")
    print(f"\nPer chapter:")
    for ch, count in stats.items():
        print(f"  {ch}: {count}")
    
    # Save to file
    output_path = "/Users/kevinvandriel/Developer/QuizMyself/test-data/c949-chapter-quizzes.json"
    with open(output_path, 'w') as f:
        json.dump(all_questions, f, indent=2)
    print(f"\nSaved to {output_path}")
    
    return all_questions

if __name__ == '__main__':
    main()
