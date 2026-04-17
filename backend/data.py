# Database connection setup. SQLite is used locally for prototyping; a PostgreSQL URL can be provided via the DATABASE_URL environment variable for cloud deployments.

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Defaults to a local SQLite file when no DATABASE_URL is set, which keeps the development setup frictionless.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Render and several other hosts provide PostgreSQL URLs using the "postgres://" scheme, but SQLAlchemy requires the "postgresql://" prefix.
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# check_same_thread is a SQLite-specific setting that permits the ORM session to be used across FastAPI's worker threads. It has no effect on PostgreSQL.
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
# autocommit and autoflush are disabled so transactions are explicit and predictable within each FastAPI request handler.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    # Yields a session to the request handler and guarantees it is closed afterwards, which FastAPI uses as a dependency for every database-backed endpoint.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
