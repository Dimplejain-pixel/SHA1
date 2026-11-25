
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ml.chat_engine import chat_engine
from models.user import User
from models.chat import ChatMessage
from models.report import Report
from database import get_db
from api.deps import get_optional_current_user


router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Message sent to HealthCopilot AI"
    )

    use_latest_report: bool = False


class ChatResponse(BaseModel):
    response: str
    report_used: bool = False
    report_filename: str | None = None


@router.post("/", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user)
) -> Any:

    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    report_context = None
    report_filename = None

    if request.use_latest_report:

        if current_user is None:
            raise HTTPException(
                status_code=401,
                detail="Please log in to use your medical reports."
            )

        result = await db.execute(
            select(Report)
            .where(Report.user_id == current_user.id)
            .order_by(Report.created_at.desc())
            .limit(1)
        )

        latest_report = result.scalar_one_or_none()

        if latest_report is None:
            raise HTTPException(
                status_code=404,
                detail="No saved medical report was found in your account."
            )

        report_filename = latest_report.filename

        report_context = (
            f"Report filename: {latest_report.filename}\n\n"
            f"Report summary:\n{latest_report.summary or 'Not available'}\n\n"
            f"Extracted report text:\n"
            f"{(latest_report.extracted_text or '')[:12000]}"
        )

        if not latest_report.extracted_text and not latest_report.summary:
            raise HTTPException(
                status_code=422,
                detail="The saved report does not contain readable information."
            )

    try:
        response_text = await chat_engine.respond(
            user_message,
            report_context=report_context
        )

        user_id = current_user.id if current_user else None

        db_msg_user = ChatMessage(
            user_id=user_id,
            role="user",
            content=user_message
        )

        db_msg_ai = ChatMessage(
            user_id=user_id,
            role="ai",
            content=response_text
        )

        db.add(db_msg_user)
        db.add(db_msg_ai)

        await db.commit()

        return ChatResponse(
            response=response_text,
            report_used=report_context is not None,
            report_filename=report_filename
        )

    except Exception:
        await db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to process the chat request."
        )
