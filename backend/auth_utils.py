# JWT creation and validation for stateless authentication.
# Using JWT over server-side sessions keeps the backend stateless, which simplifies deployment behind a scale-to-zero cloud provider such as Hugging Face Spaces.

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
from data import get_db

# TODO: This key is a development placeholder and should be loaded from an environment variable before any production deployment. Flagged in Chapter 6 future work.
SECRET_KEY = "coursematic-secret-key-change-in-production"
ALGORITHM = "HS256"
# Tokens expire after one hour, which balances user convenience against the window of risk if a token is leaked.
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# OAuth2PasswordBearer extracts the Bearer token from the Authorization header and feeds it into the dependency below.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    # The payload is copied rather than mutated so the caller's dict is not modified as a side effect.
    to_encode = data.copy()
    # An explicit expiry claim is added so jwt.decode can automatically reject expired tokens during validation.
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # A single exception instance is reused for every failure path so the response is identical regardless of which validation step failed, preventing information leaks.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # jwt.decode verifies the signature and automatically rejects tokens with expired "exp" claims.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # The user is re-fetched from the database on every request so deleted users cannot continue to use valid tokens they obtained before deletion.
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
