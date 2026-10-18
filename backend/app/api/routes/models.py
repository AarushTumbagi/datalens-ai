from fastapi import APIRouter
from app.schemas.models import (
    TrainModelRequest, TrainModelResponse,
    PredictScenarioRequest, PredictScenarioResponse,
    SensitivityRequest, SensitivityResponse
)
from app.services.file_loader import FileLoaderService
from app.services.modeling_service import ModelingService

router = APIRouter(prefix="/datasets", tags=["models"])

@router.post("/{dataset_id}/train", response_model=TrainModelResponse)
def train_model(dataset_id: str, req: TrainModelRequest):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    return ModelingService.train_model(
        df=df,
        dataset_id=dataset_id,
        target_col=req.target_column,
        feature_cols=req.feature_columns,
        model_type=req.model_type
    )

@router.post("/{dataset_id}/predict", response_model=PredictScenarioResponse)
def predict_scenario(dataset_id: str, req: PredictScenarioRequest):
    return ModelingService.predict_scenario(model_id=req.model_id, inputs=req.inputs)

@router.post("/{dataset_id}/sensitivity", response_model=SensitivityResponse)
def compute_sensitivity(dataset_id: str, req: SensitivityRequest):
    return ModelingService.compute_sensitivity(
        model_id=req.model_id,
        sweep_feature=req.sweep_feature,
        steps_count=req.steps
    )
