
from typing import Any, Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from database import get_db
from models.prediction import Prediction
from models.chat import ChatMessage
from models.report import Report
from models.user import User
from api.deps import get_current_active_user

router = APIRouter()


class AnalyticsResponse(BaseModel):
    total_predictions: int
    total_chats: int
    total_reports: int
    avg_confidence: float
    top_diseases: list[dict]
    recent_activity: list[dict] = []


@router.get("/", response_model=AnalyticsResponse)
async def get_analytics(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> Any:

    user_id = current_user.id

    # Total predictions for this user
    result_pred = await db.execute(
        select(func.count(Prediction.id)).where(
            Prediction.user_id == user_id
        )
    )
    total_predictions = result_pred.scalar() or 0

    # Total chat messages for this user
    result_chat = await db.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.user_id == user_id
        )
    )
    total_chats = result_chat.scalar() or 0

    # Total reports for this user
    result_rep = await db.execute(
        select(func.count(Report.id)).where(
            Report.user_id == user_id
        )
    )
    total_reports = result_rep.scalar() or 0

    # Average confidence for this user
    result_conf = await db.execute(
        select(func.avg(Prediction.confidence)).where(
            Prediction.user_id == user_id
        )
    )
    avg_conf = result_conf.scalar() or 0.0

    # Top diseases for this user
    result_top = await db.execute(
        select(
            Prediction.predicted_disease,
            func.count(Prediction.id).label("count")
        )
        .where(Prediction.user_id == user_id)
        .group_by(Prediction.predicted_disease)
        .order_by(func.count(Prediction.id).desc())
        .limit(5)
    )

    top_diseases = [
        {"disease": row.predicted_disease, "count": row.count}
        for row in result_top
    ]

    # Recent predictions for this user
    result_recent = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .limit(5)
    )

    recent_activity = []

    for pred in result_recent.scalars():
        recent_activity.append({
            "date": (
                pred.created_at.strftime("%Y-%m-%d")
                if pred.created_at else "N/A"
            ),
            "event": f"AI Check: {pred.predicted_disease}",
            "status": "COMPLETED"
        })

    return AnalyticsResponse(
        total_predictions=total_predictions,
        total_chats=total_chats,
        total_reports=total_reports,
        avg_confidence=round(float(avg_conf), 2),
        top_diseases=top_diseases,
        recent_activity=recent_activity
    )
