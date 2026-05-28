from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

try:
    from backend import models
    from backend.core.security import (
        create_access_token,
        get_password_hash,
        verify_password,
    )
    from backend.database import engine, get_db
    from backend.services.ml_service import process_student_csv
except ImportError:
    import models
    from core.security import create_access_token, get_password_hash, verify_password
    from database import engine, get_db
    from services.ml_service import process_student_csv


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FAILSAFE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreateRequest(BaseModel):
    """Registration payload for creating a new user account."""

    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


def _serialize_prediction(prediction: models.Prediction) -> dict[str, Any]:
    """Convert a prediction ORM object into an API-friendly dictionary."""
    return {
        "id": prediction.id,
        "student_id": prediction.student_id,
        "at_risk_prediction": prediction.at_risk_prediction,
        "risk_probability": prediction.risk_probability,
        "top_risk_factors": prediction.top_risk_factors,
        "recommended_interventions": prediction.recommended_interventions,
    }


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreateRequest, db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Register a new user with a securely hashed password."""
    normalized_email = payload.email.strip().lower()
    existing_user = (
        db.query(models.User).filter(models.User.email == normalized_email).first()
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    user = models.User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create the user account.",
        ) from exc

    return {"id": user.id, "email": user.email}


@app.post("/api/auth/login")
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Authenticate a user and issue a JWT access token."""
    normalized_email = form_data.username.strip().lower()
    user = db.query(models.User).filter(models.User.email == normalized_email).first()

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/predict/upload")
async def upload_prediction_csv(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    """Run batch inference on an uploaded CSV and persist the results."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A CSV file is required.",
        )

    csv_content = await file.read()
    try:
        prediction_payloads = process_student_csv(csv_content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction processing failed.",
        ) from exc

    prediction_records = [
        models.Prediction(**payload) for payload in prediction_payloads
    ]
    db.add_all(prediction_records)

    try:
        db.commit()
        for prediction in prediction_records:
            db.refresh(prediction)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save prediction results.",
        ) from exc

    return [_serialize_prediction(prediction) for prediction in prediction_records]


@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Return all stored prediction results for dashboard consumption."""
    predictions = db.query(models.Prediction).order_by(models.Prediction.id.asc()).all()
    return [_serialize_prediction(prediction) for prediction in predictions]
