
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ml.predictor import predictor
from models.user import User
from models.prediction import Prediction
from database import get_db
from api.deps import get_optional_current_user

router = APIRouter()


class PredictionRequest(BaseModel):
    symptoms: str | list[str]

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, value: str | list[str]) -> str | list[str]:
        text = value if isinstance(value, str) else " ".join(value)

        if not text.strip():
            raise ValueError("Symptoms cannot be empty")

        if len(text) > 1000:
            raise ValueError("Symptoms text too long (max 1000 characters)")

        return value


class DifferentialDiagnosis(BaseModel):
    disease: str
    confidence: float


class PredictionResponse(BaseModel):
    disease: str
    confidence: float
    specialist: str
    differentials: list[DifferentialDiagnosis] = Field(default_factory=list)
    model: str = "unknown"
    low_confidence: bool = True
    result_note: str = ""


@router.post("/", response_model=PredictionResponse)
async def predict_disease(
    request: PredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> Any:

    symptoms_text = (
        " ".join(request.symptoms)
        if isinstance(request.symptoms, list)
        else request.symptoms
    )

    result = predictor.predict(symptoms_text)

    db_pred = Prediction(
        user_id=current_user.id if current_user else None,
        symptoms=symptoms_text,
        predicted_disease=result["disease"],
        confidence=result["confidence"],
        suggested_specialist=result["specialist"],
    )

    db.add(db_pred)
    await db.commit()

    return PredictionResponse(**result)


@router.get("/status")
async def model_status() -> dict:
    return predictor.model_info
