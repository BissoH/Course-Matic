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
    Read this lecture text and make {num_qs} multiple choice questions.
    Return ONLY a JSON object with a single key "questions" containing an array.
    No markdown, no intro text, just the raw JSON.
    Format example:
    {{"questions": [{{
        "question": "...",
        "options": ["option A text", "option B text", "option C text", "option D text"],
        "answer": "A",
        "explanation": "..."
    }}]}}

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

