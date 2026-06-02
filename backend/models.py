from __future__ import annotations

from sqlalchemy import Column, Float, Integer, JSON, String

try:
    from backend.database import Base
except ImportError:
    from database import Base


class User(Base):
    """Application user account used for authentication."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Prediction(Base):
    """Stored prediction result for a student record."""

    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    at_risk_prediction = Column(Integer, nullable=False)
    risk_probability = Column(Float, nullable=False)
    top_risk_factors = Column(JSON, nullable=False)
    recommended_interventions = Column(JSON, nullable=False)
