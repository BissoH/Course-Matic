import json
import urllib.request
import urllib.error

def get_quiz_from_ollama(text):
  
    if not text or len(text.strip()) == 0:
        return []

    
    word_count = len(text.split())
    num_qs = max(5, min(20, word_count // 150))
    
    print("DEBUG: extracted", word_count, "words")
    print("DEBUG: asking ollama for", num_qs, "questions...")


    prompt = f"""
    Analyze the following provided course material and generate {num_qs} multiple-choice questions.

    CRITICAL FORMATTING RULES:
    1. Base all questions strictly on the provided content.
    2. For each question, identify a specific sub-topic (e.g., 'DevOps Basics', 'Team Collaboration').
    3. IMPORTANT: Do NOT include letters (A, B, C, D) in the option strings. Provide the raw text only.
    4. NEVER use "None of the above", "All of the above", or "Both A and B" as options.
    5. The "answer" field must be a single letter ONLY: "A", "B", "C", or "D". No extra text.

    Return ONLY a JSON object:
    {{
        "questions": [{{
            "question": "The actual question text?",
            "topic": "Sub-topic Name",
            "options": ["Raw option 1", "Raw option 2", "Raw option 3", "Raw option 4"],
            "answer": "A",
            "explanation": "Brief explanation why A is correct..."
        }}]
    }}

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

