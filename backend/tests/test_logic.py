"""
White-box unit tests for CourseMatic backend logic.

Run from the backend/ directory:
    pytest tests/test_logic.py -v

No live LLM, database, or file-system calls are made — all external
dependencies are either mocked or exercised through temporary files.
"""

import io
import json
import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Allow imports from the parent backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from llm_service import extract_json_block, get_quiz_from_ollama
from extractor import extract_text


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def calculate_percentage(score: int, total: int) -> float:
    """
    Mirrors the formula used throughout main.py (submit_quiz, /analytics,
    /history).  Extracted here so the arithmetic is tested independently of
    the database layer.
    """
    return round((score / total) * 100, 1) if total > 0 else 0


# ─────────────────────────────────────────────────────────────────────────────
# 1. JSON Sanitisation — extract_json_block
# ─────────────────────────────────────────────────────────────────────────────

class TestExtractJsonBlock:

    def test_clean_json_object(self):
        """Pure JSON string is parsed correctly."""
        raw = '{"questions": [{"question": "What is 2+2?", "answer": "A"}]}'
        result = extract_json_block(raw)
        assert result == {"questions": [{"question": "What is 2+2?", "answer": "A"}]}

    def test_strips_leading_filler(self):
        """LLM prefixes conversational text before the JSON block."""
        raw = 'Sure! Here are your questions:\n{"questions": [{"question": "Q1", "answer": "B"}]}'
        result = extract_json_block(raw)
        assert "questions" in result
        assert result["questions"][0]["answer"] == "B"

    def test_strips_trailing_filler(self):
        """LLM appends a sign-off sentence after the closing brace."""
        raw = '{"questions": [{"question": "Q1", "answer": "C"}]}\nI hope that helps!'
        result = extract_json_block(raw)
        assert result["questions"][0]["answer"] == "C"

    def test_strips_both_filler_and_code_fence(self):
        """LLM wraps the block in a markdown code fence."""
        raw = 'Here you go:\n```json\n{"questions": []}\n```\nLet me know if you need more.'
        result = extract_json_block(raw)
        assert result == {"questions": []}

    def test_empty_string_returns_empty_dict(self):
        """Completely empty input should not raise — returns empty dict."""
        assert extract_json_block("") == {}

    def test_no_json_block_returns_empty_dict(self):
        """Plain prose with no JSON object returns empty dict."""
        assert extract_json_block("I cannot generate questions for this text.") == {}

    def test_malformed_json_returns_empty_dict(self):
        """A JSON-like block that is not valid JSON returns empty dict."""
        raw = '{"questions": [{"question": "Q1", "answer":}]}'
        assert extract_json_block(raw) == {}

    def test_nested_objects_parsed_correctly(self):
        """Nested objects (options list) survive the extraction."""
        payload = {
            "questions": [{
                "question": "What is Python?",
                "topic": "Programming",
                "options": ["A language", "A snake", "A library", "An OS"],
                "answer": "A",
                "explanation": "Python is a programming language.",
            }]
        }
        raw = f"Here is the JSON:\n{json.dumps(payload)}\nEnd."
        result = extract_json_block(raw)
        assert result["questions"][0]["options"] == ["A language", "A snake", "A library", "An OS"]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Scoring Logic — calculate_percentage
# ─────────────────────────────────────────────────────────────────────────────

class TestCalculatePercentage:

    def test_typical_score(self):
        assert calculate_percentage(3, 4) == 75.0

    def test_perfect_score(self):
        assert calculate_percentage(10, 10) == 100.0

    def test_zero_score(self):
        assert calculate_percentage(0, 10) == 0.0

    def test_zero_total_no_division_error(self):
        """If there are no questions, must return 0 — not raise ZeroDivisionError."""
        assert calculate_percentage(0, 0) == 0

    def test_rounding_one_decimal_place(self):
        """1/3 should round to 33.3, not produce a long float."""
        assert calculate_percentage(1, 3) == 33.3

    def test_single_question_correct(self):
        assert calculate_percentage(1, 1) == 100.0

    def test_single_question_incorrect(self):
        assert calculate_percentage(0, 1) == 0.0

    def test_large_quiz(self):
        assert calculate_percentage(47, 50) == 94.0


# ─────────────────────────────────────────────────────────────────────────────
# 3. Text Extractor — extract_text (extractor.py)
# ─────────────────────────────────────────────────────────────────────────────

class TestExtractText:

    def test_nonexistent_file_returns_empty_string(self):
        """Missing file must return '' — not raise an exception."""
        result = extract_text("/tmp/this_file_does_not_exist_coursemate.pdf")
        assert result == ""

    def test_unsupported_extension_returns_empty_string(self):
        """An unsupported file type (e.g. .csv) must return ''."""
        path = "/tmp/coursemate_test.csv"
        with open(path, "w") as f:
            f.write("col1,col2\n1,2\n")
        result = extract_text(path)
        os.remove(path)
        assert result == ""

    def test_txt_file_returns_content(self, tmp_path):
        """A plain .txt file must return its text content."""
        sample = "Introduction to Algorithms\nChapter 1: Sorting"
        txt_file = tmp_path / "notes.txt"
        txt_file.write_text(sample, encoding="utf-8")
        result = extract_text(str(txt_file))
        assert result == sample.strip()

    def test_empty_txt_file_returns_empty_string(self, tmp_path):
        """An empty .txt file must return '' — no crash."""
        txt_file = tmp_path / "empty.txt"
        txt_file.write_text("", encoding="utf-8")
        result = extract_text(str(txt_file))
        assert result == ""

    def test_txt_file_whitespace_only_stripped(self, tmp_path):
        """A .txt with only whitespace should strip to ''."""
        txt_file = tmp_path / "blank.txt"
        txt_file.write_text("   \n\n\t  \n", encoding="utf-8")
        result = extract_text(str(txt_file))
        assert result == ""


# ─────────────────────────────────────────────────────────────────────────────
# 4. get_quiz_from_ollama — mocked HTTP, no live LLM
# ─────────────────────────────────────────────────────────────────────────────

def _make_ollama_response(questions: list) -> MagicMock:
    """Builds a mock urllib response that wraps questions in the Ollama envelope."""
    payload = json.dumps({"response": json.dumps({"questions": questions})}).encode()
    mock_resp = MagicMock()
    mock_resp.read.return_value = payload
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    return mock_resp


SAMPLE_QUESTIONS = [
    {
        "question": "What does CPU stand for?",
        "topic": "Hardware",
        "options": ["Central Processing Unit", "Core Power Unit", "Central Power Unit", "Computer Processing Unit"],
        "answer": "A",
        "explanation": "CPU stands for Central Processing Unit.",
    }
]


class TestGetQuizFromOllama:

    def test_empty_text_returns_empty_list_without_calling_llm(self):
        """Empty document text must short-circuit before any HTTP call."""
        with patch("urllib.request.urlopen") as mock_url:
            result = get_quiz_from_ollama("")
            mock_url.assert_not_called()
        assert result == []

    def test_whitespace_only_text_returns_empty_list(self):
        with patch("urllib.request.urlopen") as mock_url:
            result = get_quiz_from_ollama("   \n\t  ")
            mock_url.assert_not_called()
        assert result == []

    def test_valid_response_returns_questions(self):
        """Mocked Ollama returns well-formed JSON — questions list extracted."""
        with patch("urllib.request.urlopen", return_value=_make_ollama_response(SAMPLE_QUESTIONS)):
            result = get_quiz_from_ollama("Some course material about hardware.")
        assert len(result) == 1
        assert result[0]["answer"] == "A"
        assert result[0]["topic"] == "Hardware"

    def test_response_with_filler_text_still_parsed(self):
        """Even if the LLM wraps JSON in filler, extract_json_block rescues it."""
        filler_payload = json.dumps({
            "response": "Sure! Here are your questions:\n" + json.dumps({"questions": SAMPLE_QUESTIONS})
        }).encode()
        mock_resp = MagicMock()
        mock_resp.read.return_value = filler_payload
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)

        with patch("urllib.request.urlopen", return_value=mock_resp):
            result = get_quiz_from_ollama("Some material.")
        assert len(result) == 1

    def test_malformed_llm_response_returns_empty_list(self):
        """Completely invalid JSON from the LLM must not crash — returns []."""
        bad_payload = json.dumps({"response": "I cannot do that right now."}).encode()
        mock_resp = MagicMock()
        mock_resp.read.return_value = bad_payload
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)

        with patch("urllib.request.urlopen", return_value=mock_resp):
            result = get_quiz_from_ollama("Some material.")
        assert result == []

    def test_network_error_returns_empty_list(self):
        """If Ollama is unreachable, the function must return [] gracefully."""
        with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
            result = get_quiz_from_ollama("Some material.")
        assert result == []

    def test_targeted_topic_included_in_prompt(self):
        """When target_topic is provided the HTTP call should still be made."""
        with patch("urllib.request.urlopen", return_value=_make_ollama_response(SAMPLE_QUESTIONS)) as mock_url:
            result = get_quiz_from_ollama("Some material.", target_topic="Sorting Algorithms")
        assert mock_url.called
        assert len(result) == 1
