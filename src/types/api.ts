export type ColumnType = "numerical" | "categorical" | "datetime" | "text";

export interface HistogramBin {
  bin_start?: number;
  bin_end?: number;
  label: string;
  count: number;
}

export interface ColumnProfile {
  name: string;
  inferred_type: ColumnType;
  raw_dtype: string;
  total_count: number;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  is_constant: boolean;
  mean?: number;
  std?: number;
  min?: number;
  q25?: number;
  median?: number;
  q75?: number;
  max?: number;
  skewness?: number;
  outliers_count?: number;
  top_categories?: Array<{ label: string; count: number; pct: number }>;
  histogram_bins?: HistogramBin[];
}

export interface DatasetProfile {
  dataset_id: string;
  filename: string;
  row_count: number;
  column_count: number;
  duplicate_rows_count: number;
  duplicate_rows_pct: number;
  total_missing_cells: number;
  total_missing_pct: number;
  columns: ColumnProfile[];
  warnings: string[];
}

export interface DatasetPreview {
  dataset_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface SampleDataset {
  sample_id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: ColumnType;
  missing_pct: number;
  unique_count: number;
  stats: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  metric: string;
  value: number;
  abs_value: number;
  direction?: string;
  p_value?: number;
  valid_observations: number;
  interpretation: string;
}

export interface RelationshipGraph {
  dataset_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  threshold: number;
  total_possible_pairs: number;
  connected_pairs: number;
}

export interface PairwiseDetail {
  var1: string;
  var2: string;
  metric_name: string;
  metric_value: number;
  p_value?: number;
  valid_n: number;
  interpretation: string;
  limitations: string;
  scatter_sample: Record<string, any>[];
  trend_line?: {
    slope: number;
    intercept: number;
    x_start: number;
    y_start: number;
    x_end: number;
    y_end: number;
  };
}

export interface ModelMetrics {
  r2_score: number;
  rmse: number;
  mae: number;
  cv_r2_mean: number;
  cv_r2_std: number;
  test_size: number;
  train_size: number;
}

export interface TrainModelResult {
  model_id: string;
  dataset_id: string;
  target_column: string;
  feature_columns: string[];
  model_type: string;
  metrics: ModelMetrics;
  feature_importances: Array<{ feature: string; importance: number }>;
  baseline_inputs: Record<string, any>;
  baseline_prediction: number;
  warnings: string[];
}

export interface PredictResult {
  model_id: string;
  prediction: number;
  baseline_prediction: number;
  delta_absolute: number;
  delta_relative_pct?: number;
  is_extrapolating: boolean;
  extrapolation_warnings: string[];
}

export interface SensitivityStep {
  value: number | string;
  prediction: number;
  delta_from_baseline: number;
}

export interface SensitivityResult {
  model_id: string;
  sweep_feature: string;
  steps: SensitivityStep[];
}

export interface EvidenceItem {
  metric: string;
  value: string;
  context: string;
}

export interface ContextExplainResult {
  headline: string;
  explanation: string;
  evidence: EvidenceItem[];
  warnings: string[];
  suggested_actions: string[];
  provider: string;
}

export interface QuestionResult {
  question: string;
  interpreted_operation: string;
  answer: string;
  evidence_table?: Record<string, any>[];
  chart_config?: {
    type: string;
    x_col: string;
    y_col?: string;
  };
  confidence: string;
}

export interface InsightItem {
  id: string;
  category: "correlation" | "anomaly" | "distribution" | "data_quality";
  title: string;
  explanation: string;
  evidence: string;
  score: number;
  target_tab: "explorer" | "visualizations" | "relationships" | "what-if";
  context_key?: string;
}

export interface RankedInsights {
  dataset_id: string;
  insights: InsightItem[];
}

export type WorkspaceTab = "overview" | "explorer" | "visualizations" | "relationships" | "what-if" | "insights";
