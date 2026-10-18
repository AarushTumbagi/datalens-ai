from fastapi import APIRouter
import pandas as pd
from typing import List
from app.schemas.models import RankedInsightsResponse, InsightItem
from app.services.file_loader import FileLoaderService
from app.services.profiling_service import ProfilingService
from app.services.statistics_service import StatisticsService

router = APIRouter(prefix="/datasets", tags=["insights"])

@router.get("/{dataset_id}/insights", response_model=RankedInsightsResponse)
def get_ranked_insights(dataset_id: str):
    df, filename = FileLoaderService.get_dataset(dataset_id)
    profile = ProfilingService.profile_dataframe(df, dataset_id, filename)
    graph = StatisticsService.compute_relationship_graph(df, dataset_id, threshold=0.20)
    
    insights: List[InsightItem] = []
    
    # 1. Top correlation insights
    if graph.edges:
        top_edges = sorted(graph.edges, key=lambda e: e.abs_value, reverse=True)[:3]
        for idx, edge in enumerate(top_edges):
            strength = "strong" if edge.abs_value >= 0.7 else "moderate"
            insights.append(InsightItem(
                id=f"corr_{idx}",
                category="correlation",
                title=f"{strength.capitalize()} Association: {edge.source} & {edge.target}",
                explanation=f"Calculated {edge.metric} of {edge.value:.3f}. {edge.interpretation}",
                evidence=f"Metric: {edge.metric} = {edge.value:.3f} across {edge.valid_observations:,} complete pairs.",
                score=round(float(edge.abs_value) * 10, 2),
                target_tab="relationships",
                context_key=f"{edge.source}__{edge.target}"
            ))

    # 2. Outliers / anomalies
    for col_prof in profile.columns:
        if col_prof.outliers_count and col_prof.outliers_count > 0:
            outlier_pct = round((col_prof.outliers_count / col_prof.total_count) * 100, 1)
            if outlier_pct >= 3.0:
                insights.append(InsightItem(
                    id=f"anomaly_{col_prof.name}",
                    category="anomaly",
                    title=f"Outlier Spike in '{col_prof.name}'",
                    explanation=f"Found {col_prof.outliers_count} values ({outlier_pct}%) outside the 1.5x IQR boundaries.",
                    evidence=f"Range: [{col_prof.min}, {col_prof.max}], Median: {col_prof.median}, Outliers: {col_prof.outliers_count}",
                    score=round(outlier_pct * 1.5, 2),
                    target_tab="visualizations",
                    context_key=col_prof.name
                ))

    # 3. Distribution Skewness
    for col_prof in profile.columns:
        if col_prof.skewness is not None and abs(col_prof.skewness) > 1.2:
            direction = "right-skewed (long upper tail)" if col_prof.skewness > 0 else "left-skewed (long lower tail)"
            insights.append(InsightItem(
                id=f"dist_{col_prof.name}",
                category="distribution",
                title=f"Asymmetric Distribution: '{col_prof.name}'",
                explanation=f"Variable exhibits marked {direction} with skewness coefficient {col_prof.skewness:.2f}.",
                evidence=f"Skewness: {col_prof.skewness:.2f}, Mean: {col_prof.mean}, Median: {col_prof.median}",
                score=round(abs(col_prof.skewness) * 2.0, 2),
                target_tab="visualizations",
                context_key=col_prof.name
            ))

    # 4. Data Quality / Missingness
    if profile.duplicate_rows_count > 0:
        insights.append(InsightItem(
            id="dup_rows",
            category="data_quality",
            title=f"Duplicate Records Present ({profile.duplicate_rows_count} rows)",
            explanation=f"{profile.duplicate_rows_pct}% of records are exact row duplicates.",
            evidence=f"{profile.duplicate_rows_count} duplicated rows detected.",
            score=5.0,
            target_tab="explorer"
        ))

    for col_prof in profile.columns:
        if col_prof.missing_pct > 15.0:
            insights.append(InsightItem(
                id=f"missing_{col_prof.name}",
                category="data_quality",
                title=f"High Sparsity: '{col_prof.name}'",
                explanation=f"Column has {col_prof.missing_pct}% missing values ({col_prof.missing_count} nulls).",
                evidence=f"Missing: {col_prof.missing_count}/{col_prof.total_count} ({col_prof.missing_pct}%)",
                score=round(col_prof.missing_pct * 0.2, 2),
                target_tab="explorer",
                context_key=col_prof.name
            ))

    # Sort insights by score descending
    insights = sorted(insights, key=lambda x: x.score, reverse=True)

    return RankedInsightsResponse(dataset_id=dataset_id, insights=insights)
