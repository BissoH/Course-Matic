from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict
import os
import shutil
import models
import authentication
from data import engine, get_db, Base
from fastapi.staticfiles import StaticFiles
from extractor import extract_text
from auth_utils import create_access_token, get_current_user
from llm_service import get_quiz_from_ollama

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

UPLOAD_DIR = "Uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserAuth(BaseModel):
    email: str
    password: str

class QuizSubmission(BaseModel):
    answers: Dict[int, str]


@app.post("/register")
def register(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = authentication.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created", "email": new_user.email}


@app.post("/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not authentication.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer", "email": db_user.email}

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = current_user

    
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    print(f"Reading file: {file.filename}...")
    extracted_text = extract_text(file_location)
    
    if extracted_text:
        print(f"\n--- SUCCESS! First 300 characters ---\n{extracted_text[:300]}...\n-------------------------------------\n")
    else:
        print("\n--- WARNING: No text could be extracted! ---\n")

    
    new_doc = models.Document(filename=file.filename, user_id=user.id)
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"message": "File uploaded successfully", "filename": file.filename}

@app.get("/documents")
def get_documents(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return current_user.documents

@app.post("/quiz/generate")
def generate_quiz(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = f"{UPLOAD_DIR}/{doc.filename}"
    text = extract_text(file_path)
    if not text:
        raise HTTPException(status_code=422, detail="Could not extract text from document")

    raw_questions = get_quiz_from_ollama(text)
    if not raw_questions:
        raise HTTPException(status_code=502, detail="AI failed to generate questions")

    quiz = models.Quiz(document_id=doc.id, title=f"Quiz: {doc.filename}")
    db.add(quiz)
    db.flush()

    for q in raw_questions:
        options = q.get("options", [])
        question = models.Question(
            quiz_id=quiz.id,
            question_text=q.get("question", ""),
            option_a=options[0] if len(options) > 0 else "",
            option_b=options[1] if len(options) > 1 else "",
            option_c=options[2] if len(options) > 2 else "",
            option_d=options[3] if len(options) > 3 else "",
            correct_answer=q.get("answer", ""),
            explanation=q.get("explanation", ""),
            topic=q.get("topic", "General")
        )
        db.add(question)

    db.commit()
    db.refresh(quiz)
    return {"quiz_id": quiz.id}

@app.get("/quiz/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = []
    for q in quiz.questions:
        questions.append({
            "id": q.id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
        })

    return {"quiz_id": quiz.id, "title": quiz.title, "questions": questions}

@app.get("/documents/{doc_id}/quizzes")
def get_quizzes_for_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return [{"quiz_id": q.id, "title": q.title, "created_at": q.created_at} for q in doc.quizzes]

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = f"uploads/{doc.filename}"
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(doc)
    db.commit()
    
    return {"message": "Document deleted successfully"}

@app.post("/quiz/{quiz_id}/submit")
def submit_quiz(
    quiz_id: int,
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    quiz = db.query(models.Quiz).join(models.Document).filter(
        models.Quiz.id == quiz_id,
        models.Document.user_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    score = 0
    breakdown = []
    topic_map = {}  # { topic_name: {"correct": int, "total": int} }

    for question in quiz.questions:
        selected = submission.answers.get(question.id)
        if selected is None:
            continue

        is_correct = selected.strip().upper() == question.correct_answer.strip().upper()
        if is_correct:
            score += 1

        topic = question.topic or "General"
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0}
        topic_map[topic]["total"] += 1
        if is_correct:
            topic_map[topic]["correct"] += 1

        db.add(models.UserAnswer(
            user_id=current_user.id,
            question_id=question.id,
            selected_answer=selected,
            is_correct=is_correct,
        ))

        breakdown.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "your_answer": selected,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "topic": topic,
        })

    total = len(quiz.questions)

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        overall_score=score,
        total_questions=total,
    )
    db.add(attempt)
    db.flush()

    for topic_name, counts in topic_map.items():
        db.add(models.TopicPerformance(
            attempt_id=attempt.id,
            topic_name=topic_name,
            correct_count=counts["correct"],
            total_count=counts["total"],
        ))

    db.commit()

    topic_breakdown = {
        topic: {"score": f"{v['correct']}/{v['total']}", "correct": v["correct"], "total": v["total"]}
        for topic, v in topic_map.items()
    }

    return {
        "quiz_id": quiz_id,
        "score": score,
        "total": total,
        "percentage": round((score / total) * 100, 1) if total > 0 else 0,
        "breakdown": breakdown,
        "topic_breakdown": topic_breakdown,
    }
