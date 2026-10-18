from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# Dataset & Profiling Schemas
class ColumnProfile(BaseModel):
    name: str
    inferred_type: str  # numerical, categorical, datetime, text
    raw_dtype: str
    total_count: int
    missing_count: int
    missing_pct: float
    unique_count: int
    is_constant: bool
    # Numerical statistics
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    q25: Optional[float] = None
    median: Optional[float] = None
    q75: Optional[float] = None
    max: Optional[float] = None
    skewness: Optional[float] = None
    outliers_count: Optional[int] = None
    # Categorical statistics
    top_categories: Optional[List[Dict[str, Any]]] = None
    # Sample distribution for sparklines/histograms
    histogram_bins: Optional[List[Dict[str, Any]]] = None

class DatasetProfileResponse(BaseModel):
    dataset_id: str
    filename: str
    row_count: int
    column_count: int
    duplicate_rows_count: int
    duplicate_rows_pct: float
    total_missing_cells: int
    total_missing_pct: float
    columns: List[ColumnProfile]
    warnings: List[str]

class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    filename: str
    total_rows: int
    total_columns: int
    columns: List[str]
    rows: List[Dict[str, Any]]

class DatasetSampleItem(BaseModel):
    sample_id: str
    name: str
    description: str
    rows: int
    columns: int

# Relationship Schemas
class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # numerical, categorical, datetime
    missing_pct: float
    unique_count: int
    stats: Dict[str, Any]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    metric: str  # pearson, spearman, cramers_v, correlation_ratio
    value: float
    abs_value: float
    direction: Optional[str] = None  # positive, negative, association
    p_value: Optional[float] = None
    valid_observations: int
    interpretation: str

class RelationshipGraphResponse(BaseModel):
    dataset_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    threshold: float
    total_possible_pairs: int
    connected_pairs: int

class PairwiseDetailResponse(BaseModel):
    var1: str
    var2: str
    metric_name: str
    metric_value: float
    p_value: Optional[float] = None
    valid_n: int
    interpretation: str
    limitations: str
    scatter_sample: List[Dict[str, Any]]
    trend_line: Optional[Dict[str, Any]] = None

# What-If Simulator Schemas
class TrainModelRequest(BaseModel):
    target_column: str
    feature_columns: List[str]
    model_type: str = "ridge"  # ridge, elastic_net, random_forest

class ModelEvaluationMetrics(BaseModel):
    r2_score: float
    rmse: float
    mae: float
    cv_r2_mean: float
    cv_r2_std: float
    test_size: int
    train_size: int

class TrainModelResponse(BaseModel):
    model_id: str
    dataset_id: str
    target_column: str
    feature_columns: List[str]
    model_type: str
    metrics: ModelEvaluationMetrics
    feature_importances: List[Dict[str, Any]]
    baseline_inputs: Dict[str, Any]
    baseline_prediction: float
    warnings: List[str]

class PredictScenarioRequest(BaseModel):
    model_id: str
    inputs: Dict[str, Any]

class PredictScenarioResponse(BaseModel):
    model_id: str
    prediction: float
    baseline_prediction: float
    delta_absolute: float
    delta_relative_pct: Optional[float] = None
    is_extrapolating: bool
    extrapolation_warnings: List[str]

class SensitivityRequest(BaseModel):
    model_id: str
    sweep_feature: str
    steps: int = 25

class SensitivityResponse(BaseModel):
    model_id: str
    sweep_feature: str
    steps: List[Dict[str, Any]]  # value, prediction, delta_from_baseline

# Explanation & Natural Language Schemas
class ContextExplainRequest(BaseModel):
    context_type: str  # dataset, column, relationship, what_if, selection
    target_name: Optional[str] = None
    secondary_name: Optional[str] = None
    selected_rows_indices: Optional[List[int]] = None
    custom_focus: Optional[str] = None

class EvidenceItem(BaseModel):
    metric: str
    value: str
    context: str

class ContextExplainResponse(BaseModel):
    headline: str
    explanation: str
    evidence: List[EvidenceItem]
    warnings: List[str]
    suggested_actions: List[str]
    provider: str  # deterministic or llm

class QuestionRequest(BaseModel):
    question: str
    context_column: Optional[str] = None

class QuestionResponse(BaseModel):
    question: str
    interpreted_operation: str
    answer: str
    evidence_table: Optional[List[Dict[str, Any]]] = None
    chart_config: Optional[Dict[str, Any]] = None
    confidence: str

# Ranked Insights Schemas
class InsightItem(BaseModel):
    id: str
    category: str  # correlation, anomaly, distribution, data_quality
    title: str
    explanation: str
    evidence: str
    score: float
    target_tab: str  # explorer, visualizations, relationships, what_if
    context_key: Optional[str] = None

class RankedInsightsResponse(BaseModel):
    dataset_id: str
    insights: List[InsightItem]
