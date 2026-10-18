from fastapi import APIRouter
from typing import List
from app.schemas.models import (
    ContextExplainRequest, ContextExplainResponse,
    QuestionRequest, QuestionResponse
)
from app.services.file_loader import FileLoaderService
from app.services.explanation_service import ExplanationService
from app.services.question_service import QuestionService

router = APIRouter(prefix="/datasets", tags=["explanations"])

@router.post("/{dataset_id}/explain", response_model=ContextExplainResponse)
def explain_context(dataset_id: str, req: ContextExplainRequest):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return ExplanationService.explain_context(
        df=df,
        context_type=req.context_type,
        target_name=req.target_name,
        secondary_name=req.secondary_name,
        selected_rows_indices=req.selected_rows_indices,
        custom_focus=req.custom_focus
    )

@router.get("/{dataset_id}/suggested-questions", response_model=List[str])
def get_suggested_questions(dataset_id: str):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return QuestionService.get_suggested_questions(df)

@router.post("/{dataset_id}/question", response_model=QuestionResponse)
def ask_question(dataset_id: str, req: QuestionRequest):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return QuestionService.answer_question(
        df=df,
        question=req.question,
        context_col=req.context_column
    )
