# FastAPI application exposing the REST API consumed by the React frontend.
# Routes cover authentication, document upload, quiz generation and submission, and analytics aggregation.

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional
import os
import shutil
import models
import authentication
from data import engine, get_db, Base
from fastapi.staticfiles import StaticFiles
from extractor import extract_text
from auth_utils import create_access_token, get_current_user
from llm_service import get_quiz_from_ollama

# Creates any missing tables in the database on startup based on the SQLAlchemy models.
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def root():
    # Lightweight endpoint used by the frontend to detect whether the FastAPI backend is reachable.
    return {"status": "CourseMatic API is running"}


@app.get("/health")
def health():
    # Pings the local Ollama server to confirm that Llama 3 has finished loading.
    # Returns 503 while the model is still warming up, which the frontend uses to display the warmup banner.
    import urllib.request
    try:
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        return {"status": "ready"}
    except Exception:
        raise HTTPException(status_code=503, detail="Llama 3 is still warming up")

# Serves uploaded files as static assets so the frontend iframe can render PDFs directly.
# This mount is unauthenticated, which is a known limitation documented in Chapter 5.2.3 and flagged as future work.
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

UPLOAD_DIR = "Uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# CORS is set to permit all origins during development. A production deployment would restrict this to the Vercel frontend domain.
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
    # Duplicate emails are rejected before any password hashing work is done.
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Passwords are hashed with bcrypt via passlib before being stored; plain passwords never touch the database.
    hashed_password = authentication.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created", "email": new_user.email}


@app.post("/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    # A single combined check on user existence and password validity avoids leaking which field was incorrect.
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not authentication.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # The JWT carries the user email in the "sub" claim; the axios interceptor attaches it to subsequent requests.
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer", "email": db_user.email}

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = current_user

    # The uploaded file is streamed to disk via shutil.copyfileobj, which uses FastAPI's SpooledTemporaryFile under the hood to avoid memory exhaustion on large files.
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    print(f"Reading file: {file.filename}...")
    extracted_text = extract_text(file_location)

    if extracted_text:
        print(f"\n--- SUCCESS! First 300 characters ---\n{extracted_text[:300]}...\n-------------------------------------\n")
    else:
        print("\n--- WARNING: No text could be extracted! ---\n")

    # The Document row stores only the filename and the owner; the actual file content lives on disk.
    new_doc = models.Document(filename=file.filename, user_id=user.id)
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"message": "File uploaded successfully", "filename": file.filename}

@app.get("/documents")
def get_documents(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # SQLAlchemy's back_populates relationship on the User model returns only documents owned by the current user.
    return current_user.documents

@app.post("/quiz/generate")
def generate_quiz(doc_id: int, target_topic: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # The document query is filtered by both doc_id and user_id to ensure a user cannot generate a quiz from another user's document.
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = f"{UPLOAD_DIR}/{doc.filename}"
    text = extract_text(file_path)
    # Empty extracted text is rejected here with 422, which is surfaced as a user alert by the frontend.
    if not text:
        raise HTTPException(status_code=422, detail="Could not extract text from document")

    raw_questions = get_quiz_from_ollama(text, target_topic=target_topic)
    # 502 is used when Ollama itself fails to produce parseable output, distinguishing model failures from client errors.
    if not raw_questions:
        raise HTTPException(status_code=502, detail="AI failed to generate questions")

    # Targeted quizzes are titled with the focused topic so they are distinguishable from general coverage quizzes in the history view.
    title = f"Targeted: {target_topic}" if target_topic else f"Quiz: {doc.filename}"
    quiz = models.Quiz(document_id=doc.id, title=title)
    db.add(quiz)
    db.flush()

    # Each raw question from the LLM is stored as a Question row with options flattened into separate columns for simpler querying.
    for q in raw_questions:
        options = q.get("options", [])
        question = models.Question(
            quiz_id=quiz.id,
            question_text=q.get("question", ""),
            option_a=options[0] if len(options) > 0 else "",
            option_b=options[1] if len(options) > 1 else "",
            option_c=options[2] if len(options) > 2 else "",
            option_d=options[3] if len(options) > 3 else "",
            # The answer is normalised to a single uppercase letter to make comparison against the user's selection unambiguous.
            correct_answer=q.get("answer", "").strip().upper()[:1],
            explanation=q.get("explanation", ""),
            topic=q.get("topic", "General")
        )
        db.add(question)

    db.commit()
    db.refresh(quiz)
    return {"quiz_id": quiz.id}

@app.get("/quiz/{quiz_id}")
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: This query should also filter by the owning user to prevent cross-user quiz reads. Documented as finding T17 in Chapter 5.2.3.
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # The correct_answer field is intentionally omitted from this response so the frontend cannot display answers before submission.
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

    return {"quiz_id": quiz.id, "title": quiz.title, "doc_id": quiz.document_id, "questions": questions}

@app.get("/documents/{doc_id}/quizzes")
def get_quizzes_for_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return [{"quiz_id": q.id, "title": q.title, "created_at": q.created_at} for q in doc.quizzes]

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: This query should also filter by user_id to prevent cross-user deletion. Documented as finding T16 in Chapter 5.2.3.
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # The file is removed from disk before the database row is deleted so the filesystem does not drift out of sync with the database state.
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
    # Ownership is verified here by joining Quiz to Document and filtering by the current user, since Quiz itself has no direct user_id column.
    quiz = db.query(models.Quiz).join(models.Document).filter(
        models.Quiz.id == quiz_id,
        models.Document.user_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    score = 0
    breakdown = []
    # Topics are aggregated in memory during the scoring loop to avoid a second database pass after all answers are recorded.
    topic_map = {}  # { topic_name: {"correct": int, "total": int} }

    for question in quiz.questions:
        selected = submission.answers.get(question.id)
        # Unanswered questions are skipped rather than counted as wrong, preserving the distinction between "got it wrong" and "did not attempt".
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

        # Each individual answer is persisted so the review screen can show which option the user picked for every question.
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

    # A QuizAttempt row records the overall result and acts as the parent for the per-topic breakdown below.
    attempt = models.QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        overall_score=score,
        total_questions=total,
    )
    db.add(attempt)
    db.flush()

    # Per-topic performance is persisted separately so analytics can aggregate across attempts later without re-scanning every answer.
    for topic_name, counts in topic_map.items():
        db.add(models.TopicPerformance(
            attempt_id=attempt.id,
            topic_name=topic_name,
            correct_count=counts["correct"],
            total_count=counts["total"],
        ))

    db.commit()
    db.refresh(attempt)

    topic_breakdown = {
        topic: {"score": f"{v['correct']}/{v['total']}", "correct": v["correct"], "total": v["total"]}
        for topic, v in topic_map.items()
    }

    return {
        "attempt_id": attempt.id,
        "quiz_id": quiz_id,
        "score": score,
        "total": total,
        # The total > 0 guard prevents a ZeroDivisionError for quizzes with no questions, verified by a dedicated unit test.
        "percentage": round((score / total) * 100, 1) if total > 0 else 0,
        "breakdown": breakdown,
        "topic_breakdown": topic_breakdown,
    }

@app.get("/history/{attempt_id}")
def get_attempt_detail(attempt_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # The attempt query filters by user_id to prevent cross-user access to quiz history.
    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.id == attempt_id,
        models.QuizAttempt.user_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    topic_breakdown = [
        {
            "topic": tp.topic_name,
            "correct": tp.correct_count,
            "total": tp.total_count,
            "percentage": round((tp.correct_count / tp.total_count) * 100, 1) if tp.total_count else 0,
        }
        for tp in attempt.topic_performances
    ]

    # The review loop fetches the most recent UserAnswer per question rather than joining, since the same question may have been answered more than once across attempts.
    questions_review = []
    for question in attempt.quiz.questions:
        user_answer = (
            db.query(models.UserAnswer)
            .filter(
                models.UserAnswer.question_id == question.id,
                models.UserAnswer.user_id == current_user.id,
            )
            .order_by(models.UserAnswer.attempted_at.desc())
            .first()
        )
        questions_review.append({
            "question_text": question.question_text,
            "topic": question.topic,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "correct_answer": question.correct_answer,
            "your_answer": user_answer.selected_answer if user_answer else None,
            "is_correct": user_answer.is_correct if user_answer else False,
            "explanation": question.explanation,
        })

    return {
        "attempt_id": attempt.id,
        "quiz_title": attempt.quiz.title if attempt.quiz else "Unknown Quiz",
        "doc_id": attempt.quiz.document_id if attempt.quiz else None,
        "score": attempt.overall_score,
        "total": attempt.total_questions,
        "percentage": round((attempt.overall_score / attempt.total_questions) * 100, 1) if attempt.total_questions else 0,
        "completed_at": attempt.completed_at,
        "topic_breakdown": topic_breakdown,
        "questions_review": questions_review,
    }

@app.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .all()
    )

    total_quizzes = len(attempts)

    # A user with no attempts receives an empty analytics payload rather than a 404, which lets the frontend render the empty-state CTA cleanly.
    if total_quizzes == 0:
        return {
            "total_quizzes_taken": 0,
            "overall_average_percentage": 0,
            "documents": [],
            "weakest_topics": [],
        }

    overall_average = round(
        sum(
            (a.overall_score / a.total_questions * 100)
            for a in attempts if a.total_questions
        ) / total_quizzes,
        1
    )

    # Topic performance is grouped by document so the frontend can display gap analysis per file rather than a single flat list.
    doc_map = {}
    for attempt in attempts:
        if not attempt.quiz or not attempt.quiz.document:
            continue
        doc = attempt.quiz.document
        if doc.id not in doc_map:
            doc_map[doc.id] = {"title": doc.filename, "topics": {}}
        for tp in attempt.topic_performances:
            name = tp.topic_name
            if name not in doc_map[doc.id]["topics"]:
                doc_map[doc.id]["topics"][name] = {"correct": 0, "total": 0}
            doc_map[doc.id]["topics"][name]["correct"] += tp.correct_count
            doc_map[doc.id]["topics"][name]["total"] += tp.total_count

    # A second map aggregates the same topic performance across all documents to identify the user's three weakest overall topics.
    all_topic_map = {}
    documents = []
    for doc_id, doc_data in doc_map.items():
        topic_summary = sorted(
            [
                {
                    "topic": name,
                    "correct": counts["correct"],
                    "total": counts["total"],
                    "percentage": round((counts["correct"] / counts["total"]) * 100, 1) if counts["total"] else 0,
                }
                for name, counts in doc_data["topics"].items()
            ],
            key=lambda t: t["percentage"],
        )
        documents.append({
            "doc_id": doc_id,
            "title": doc_data["title"],
            "topic_summary": topic_summary,
        })
        for t in topic_summary:
            n = t["topic"]
            if n not in all_topic_map:
                all_topic_map[n] = {"correct": 0, "total": 0}
            all_topic_map[n]["correct"] += t["correct"]
            all_topic_map[n]["total"] += t["total"]

    # Weakest topics are sorted ascending by percentage and capped at three to keep the dashboard recommendation focused rather than overwhelming.
    weakest_topics = sorted(
        [
            {"topic": k, "percentage": round(v["correct"] / v["total"] * 100, 1)}
            for k, v in all_topic_map.items() if v["total"] > 0
        ],
        key=lambda t: t["percentage"],
    )[:3]

    return {
        "total_quizzes_taken": total_quizzes,
        "overall_average_percentage": overall_average,
        "documents": documents,
        "weakest_topics": weakest_topics,
    }

@app.get("/history")
def get_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Attempts are ordered by completion time descending so the most recent appear at the top of the history view.
    attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .order_by(models.QuizAttempt.completed_at.desc())
        .all()
    )
    return [
        {
            "attempt_id": a.id,
            "quiz_id": a.quiz_id,
            "quiz_title": a.quiz.title if a.quiz else "Unknown Quiz",
            "doc_id": a.quiz.document_id if a.quiz else None,
            "doc_title": a.quiz.document.filename if a.quiz and a.quiz.document else "Unknown Document",
            "score": a.overall_score,
            "total": a.total_questions,
            "percentage": round((a.overall_score / a.total_questions) * 100, 1) if a.total_questions else 0,
            "completed_at": a.completed_at,
        }
        for a in attempts
    ]
