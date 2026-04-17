# SQLAlchemy ORM models defining the database schema used across the application.
# The relationships below support the analytics aggregation in main.py without requiring manual joins at query time.

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from data import Base

# Each user owns documents and has many quiz attempts; the two relationships are used separately in the analytics and history endpoints.
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    documents = relationship("Document", back_populates="owner")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")

# A Document represents an uploaded course material file. Multiple quizzes can be generated from the same document over time.
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))


    owner = relationship("User", back_populates="documents")
    quizzes = relationship("Quiz", back_populates="document")

# A Quiz is a set of questions generated from a single document. The created_at timestamp allows history to be ordered chronologically.
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String)

    document = relationship("Document", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz")

# Options are flattened into four separate columns rather than a related table because every question has exactly four options and this avoids an extra join on every quiz read.
class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(String)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_answer = Column(String)
    explanation = Column(String)
    # The topic field powers the gap analysis view and is assigned by the LLM per question.
    topic = Column(String, default="General")

    quiz = relationship("Quiz", back_populates="questions")
    user_answers = relationship("UserAnswer", back_populates="question")

# UserAnswer records every attempt at a specific question, allowing the review screen to show the most recent selection without relying on the QuizAttempt row alone.
class UserAnswer(Base):
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_answer = Column(String)
    is_correct = Column(Boolean)
    attempted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    question = relationship("Question", back_populates="user_answers")

# QuizAttempt captures the overall result of a submission and is the parent of per-topic performance rows, which is the key relationship powering topic-level analytics.
class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    overall_score = Column(Integer)
    total_questions = Column(Integer)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz")
    topic_performances = relationship("TopicPerformance", back_populates="attempt")

# TopicPerformance stores one row per topic per attempt so historical gap analysis can be aggregated without re-scanning every individual UserAnswer.
class TopicPerformance(Base):
    __tablename__ = "topic_performances"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"))
    topic_name = Column(String)
    correct_count = Column(Integer)
    total_count = Column(Integer)

    attempt = relationship("QuizAttempt", back_populates="topic_performances")
