from fastapi import APIRouter, Query
from app.schemas.models import RelationshipGraphResponse, PairwiseDetailResponse
from app.services.file_loader import FileLoaderService
from app.services.statistics_service import StatisticsService

router = APIRouter(prefix="/datasets", tags=["relationships"])

@router.get("/{dataset_id}/graph", response_model=RelationshipGraphResponse)
def get_relationship_graph(
    dataset_id: str,
    threshold: float = Query(0.20, ge=0.0, le=1.0)
):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return StatisticsService.compute_relationship_graph(df, dataset_id, threshold=threshold)

@router.get("/{dataset_id}/pairwise", response_model=PairwiseDetailResponse)
def get_pairwise_detail(
    dataset_id: str,
    var1: str = Query(...),
    var2: str = Query(...)
):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return StatisticsService.get_pairwise_detail(df, var1, var2)
