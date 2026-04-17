# This module handles communication with the local Ollama server and transforms uploaded course material into structured quiz questions.
# Defensive parsing is required because Llama 3's output frequently contains conversational text around the intended JSON payload.

import json
import re
import urllib.request
import urllib.error


def extract_json_block(text: str) -> dict:
    """
    Extracts the first complete {...} block from an LLM response and parses it as JSON.
    Returns an empty dict if no block is found or if parsing fails, allowing the caller to handle empty responses safely.
    """
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        # Malformed JSON must not crash the application; the caller is responsible for handling the empty dict.
        return {}


def get_quiz_from_ollama(text, target_topic=None):

    # Empty or whitespace-only input is short-circuited before any network call is made.
    if not text or len(text.strip()) == 0:
        return []

    # Input is truncated to 20,000 characters to remain safely within Llama 3's 8,192 token context window alongside the prompt and formatting rules.
    truncated = text[:20000]
    word_count = len(truncated.split())

    # Scales the number of questions with document length: a floor of 5 prevents trivially short quizzes, while a ceiling of 10 keeps the response short enough to avoid mid-output truncation.
    num_qs = max(5, min(10, word_count // 100))

    print("DEBUG: using", word_count, "words (truncated)")
    print("DEBUG: asking ollama for", num_qs, "questions...", f"(targeted: {target_topic})" if target_topic else "")

    # These rules are enforced in the prompt because Llama 3 otherwise tends to include letters inside option strings, use prohibited answers like "None of the above", or return fewer than four options per question.
    formatting_rules = """
    CRITICAL FORMATTING RULES:
    1. Do NOT include letters (A, B, C, D) in the option strings. Provide the raw text only.
    2. NEVER use "None of the above", "All of the above", or "Both A and B" as options.
    3. The "answer" field must be a single letter ONLY: "A", "B", "C", or "D". No extra text.
    4. Every question MUST have EXACTLY 4 options. Never fewer. The "options" array must always contain exactly 4 strings.

    Return ONLY a JSON object:
    {{
        "questions": [{{
            "question": "The actual question text?",
            "topic": "Sub-topic Name",
            "options": ["Raw option 1", "Raw option 2", "Raw option 3", "Raw option 4"],
            "answer": "A",
            "explanation": "Brief explanation why A is correct..."
        }}]
    }}"""

    # A focused prompt is used when the student is revising a specific weak topic, otherwise a broader prompt covers all topics in the document.
    if target_topic:
        prompt = f"""
    The student is struggling with '{target_topic}'. Generate {num_qs} questions focusing EXCLUSIVELY on this concept.
    Ensure a variety of difficulty levels within this single topic — start with foundational questions and progress to more applied or nuanced ones.
    Base all questions strictly on the provided course material.
    {formatting_rules}

    Text:
    {truncated}
    """
    else:
        prompt = f"""
    Analyse the following provided course material and generate {num_qs} multiple-choice questions.
    CRITICAL: For every topic identified in the material, you must generate a minimum of 2 questions for that specific topic.
    This is required to accurately assess the student's understanding and eliminate statistical outliers.
    {formatting_rules}

    Text:
    {truncated}
    """

    try:
        # urllib is used instead of the requests library to minimise dependencies and keep the Docker image small.
        # JSON parsing is handled manually because Ollama's "format": "json" parameter truncates responses prematurely.
        req_data = json.dumps({
            "model": "llama3",
            "prompt": prompt,
            "stream": False,
        }).encode('utf-8')

        req = urllib.request.Request("http://localhost:11434/api/generate", data=req_data, headers={'Content-Type': 'application/json'})

        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            # Ollama wraps the model's output inside a "response" field, which is unwrapped before sanitisation.
            parsed = extract_json_block(data.get("response", "{}"))
            # Llama 3 occasionally returns a bare JSON array rather than an object containing a "questions" field, so both response shapes are handled.
            if isinstance(parsed, list):
                return parsed
            return parsed.get("questions", [])

    except Exception as e:
        # If Ollama is unreachable or the request fails, an empty list is returned so the frontend can display a graceful error rather than crashing.
        print("ERROR fetching from ollama:", e)
        return []
