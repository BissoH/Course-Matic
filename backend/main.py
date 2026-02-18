from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import shutil
import models
import authentication
from data import engine, get_db ,Base
from fastapi.staticfiles import StaticFiles

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
def login(user : UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not authentication.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"message": "Login successful", "email": db_user.email}

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    email: str = Form(...), 
    db: Session = Depends(get_db)
):
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    
    new_doc = models.Document(filename=file.filename, user_id=user.id)
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"message": "File uploaded successfully", "filename": file.filename}

@app.get("/documents")
def get_documents(email: str, db: Session = Depends(get_db)):
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    
    return user.documents