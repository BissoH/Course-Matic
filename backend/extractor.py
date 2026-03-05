import os
from pypdf import PdfReader
import docx
from pptx import Presentation

def extract_text(file_path: str) -> str:
    """
    Takes a file path, detects the extension, and returns the extracted text.
    """
    if not os.path.exists(file_path):
        return ""
    
    _, file_extension = os.path.splitext(file_path)
    file_extension = file_extension.lower()

    text = ""

    try:
        # 1. Handle PDFs
        if file_extension == '.pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        # 2. Handle Word Documents
        elif file_extension == '.docx':
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"

        # 3. Handle PowerPoints
        elif file_extension == '.pptx':
            prs = Presentation(file_path)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"

        # 4. Handle plain text files
        elif file_extension == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

        else:
            print(f"Unsupported file type: {file_extension}")
            return ""

        return text.strip()

    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        return ""