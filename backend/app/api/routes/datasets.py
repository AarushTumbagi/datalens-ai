from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from typing import List, Dict, Any
from app.schemas.models import (
    DatasetProfileResponse, DatasetPreviewResponse, DatasetSampleItem
)
from app.services.file_loader import FileLoaderService
from app.services.profiling_service import ProfilingService

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("/samples", response_model=List[DatasetSampleItem])
def list_sample_datasets():
    return [
        DatasetSampleItem(
            sample_id="sensor",
            name="Environmental Sensor Telemetry",
            description="Time-series telemetry with temperature, humidity, current, voltage spikes, and phase readings.",
            rows=250,
            columns=7
        ),
        DatasetSampleItem(
            sample_id="housing",
            name="Urban Housing Market",
            description="Residential properties with square footage, bedrooms, neighborhood tiers, transit distance, and valuation.",
            rows=300,
            columns=6
        )
    ]

@router.post("/sample/{sample_key}")
def load_sample(sample_key: str):
    dataset_id, filename, df = FileLoaderService.load_sample_dataset(sample_key)
    profile = ProfilingService.profile_dataframe(df, dataset_id, filename)
    return {"dataset_id": dataset_id, "filename": filename, "profile": profile}

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    dataset_id, filename, df = FileLoaderService.load_from_upload(file)
    profile = ProfilingService.profile_dataframe(df, dataset_id, filename)
    return {"dataset_id": dataset_id, "filename": filename, "profile": profile}

@router.get("/{dataset_id}/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(dataset_id: str):
    df, filename = FileLoaderService.get_dataset(dataset_id)
    return ProfilingService.profile_dataframe(df, dataset_id, filename)

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def get_dataset_preview(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query(None),
    sort_desc: bool = Query(False),
    search: str = Query(None)
):
    df, filename = FileLoaderService.get_dataset(dataset_id)
    filtered_df = df.copy()

    if search:
        search_lower = search.lower()
        mask = filtered_df.astype(str).apply(lambda row: row.str.lower().str.contains(search_lower).any(), axis=1)
        filtered_df = filtered_df[mask]

    if sort_by and sort_by in filtered_df.columns:
        filtered_df = filtered_df.sort_values(by=sort_by, ascending=not sort_desc)

    total_rows = len(filtered_df)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_df = filtered_df.iloc[start_idx:end_idx]

    # Convert non-serializable values (NaN, Inf)
    clean_records = page_df.replace({float('inf'): None, float('-inf'): None}).fillna("").to_dict(orient="records")

    return DatasetPreviewResponse(
        dataset_id=dataset_id,
        filename=filename,
        total_rows=total_rows,
        total_columns=len(df.columns),
        columns=list(df.columns),
        rows=clean_records
    )
