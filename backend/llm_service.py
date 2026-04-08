import json
import urllib.request
import urllib.error

def get_quiz_from_ollama(text, target_topic=None):

    if not text or len(text.strip()) == 0:
        return []

    word_count = len(text.split())
    num_qs = max(5, min(10, word_count // 200))

    print("DEBUG: extracted", word_count, "words")
    print("DEBUG: asking ollama for", num_qs, "questions...", f"(targeted: {target_topic})" if target_topic else "")

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

    if target_topic:
        prompt = f"""
    The student is struggling with '{target_topic}'. Generate {num_qs} questions focusing EXCLUSIVELY on this concept.
    Ensure a variety of difficulty levels within this single topic — start with foundational questions and progress to more applied or nuanced ones.
    Base all questions strictly on the provided course material.
    {formatting_rules}

    Text:
    {text[:4000]}
    """
    else:
        prompt = f"""
    Analyse the following provided course material and generate {num_qs} multiple-choice questions.
    CRITICAL: For every topic identified in the material, you must generate a minimum of 2 questions for that specific topic.
    This is required to accurately assess the student's understanding and eliminate statistical outliers.
    {formatting_rules}

    Text:
    {text[:4000]}
    """

    try:
    
        req_data = json.dumps({
            "model": "llama3",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }).encode('utf-8')

        req = urllib.request.Request("http://localhost:11434/api/generate", data=req_data, headers={'Content-Type': 'application/json'})

        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            parsed = json.loads(data.get("response", "{}"))
            if isinstance(parsed, list):
                return parsed
            return parsed.get("questions", [])

    except Exception as e:
        print("ERROR fetching from ollama:", e)
        return []

