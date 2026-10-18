import {
  DatasetProfile,
  DatasetPreview,
  SampleDataset,
  RelationshipGraph,
  PairwiseDetail,
  TrainModelResult,
  PredictResult,
  SensitivityResult,
  ContextExplainResult,
  QuestionResult,
  RankedInsights,
} from "../types/api";

// Relative /api route for Vercel deployment and local Vite proxy
const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "/api";

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Datasets
  async listSamples(): Promise<SampleDataset[]> {
    return this.request<SampleDataset[]>("/datasets/samples");
  }

  async loadSample(sampleKey: string): Promise<{ dataset_id: string; filename: string; profile: DatasetProfile }> {
    return this.request(`/datasets/sample/${sampleKey}`, { method: "POST" });
  }

  async uploadFile(file: File): Promise<{ dataset_id: string; filename: string; profile: DatasetProfile }> {
    // 25MB uncompressed soft limit to guarantee compressed size < 4.5MB Vercel serverless wire payload
    if (file.size > 25 * 1024 * 1024) {
      throw new Error(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the supported limit of 25MB for serverless analysis. Please select a smaller subset or explore sample datasets.`
      );
    }

    const formData = new FormData();

    // Check if modern browser CompressionStream is available
    if (typeof CompressionStream !== "undefined" && file.size > 100 * 1024) {
      try {
        const compressedStream = file.stream().pipeThrough(new CompressionStream("gzip"));
        const compressedBlob = await new Response(compressedStream).blob();
        const gzippedFile = new File([compressedBlob], `${file.name}.gz`, { type: "application/gzip" });
        formData.append("file", gzippedFile);
      } catch (err) {
        // Fallback to uncompressed upload if streaming compression fails
        formData.append("file", file);
      }
    } else {
      formData.append("file", file);
    }

    return this.request("/datasets/upload", {
      method: "POST",
      body: formData,
    });
  }

  async getProfile(datasetId: string): Promise<DatasetProfile> {
    return this.request<DatasetProfile>(`/datasets/${datasetId}/profile`);
  }

  async getPreview(
    datasetId: string,
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    sortBy?: string,
    sortDesc: boolean = false
  ): Promise<DatasetPreview> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_desc: sortDesc ? "true" : "false",
    });
    if (search) params.append("search", search);
    if (sortBy) params.append("sort_by", sortBy);
    return this.request<DatasetPreview>(`/datasets/${datasetId}/preview?${params.toString()}`);
  }

  // Relationships
  async getRelationshipGraph(datasetId: string, threshold: number = 0.2): Promise<RelationshipGraph> {
    return this.request<RelationshipGraph>(`/datasets/${datasetId}/graph?threshold=${threshold}`);
  }

  async getPairwiseDetail(datasetId: string, var1: string, var2: string): Promise<PairwiseDetail> {
    return this.request<PairwiseDetail>(`/datasets/${datasetId}/pairwise?var1=${encodeURIComponent(var1)}&var2=${encodeURIComponent(var2)}`);
  }

  // What-If Models
  async trainModel(
    datasetId: string,
    targetColumn: string,
    featureColumns: string[],
    modelType: string = "ridge"
  ): Promise<TrainModelResult> {
    return this.request<TrainModelResult>(`/datasets/${datasetId}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_column: targetColumn,
        feature_columns: featureColumns,
        model_type: modelType,
      }),
    });
  }

  async predictScenario(datasetId: string, modelId: string, inputs: Record<string, any>): Promise<PredictResult> {
    return this.request<PredictResult>(`/datasets/${datasetId}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, inputs }),
    });
  }

  async getSensitivity(datasetId: string, modelId: string, sweepFeature: string, steps: number = 25): Promise<SensitivityResult> {
    return this.request<SensitivityResult>(`/datasets/${datasetId}/sensitivity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, sweep_feature: sweepFeature, steps }),
    });
  }

  // Explanations & Questions
  async explainContext(
    datasetId: string,
    contextType: string,
    targetName?: string,
    secondaryName?: string,
    selectedRowsIndices?: number[]
  ): Promise<ContextExplainResult> {
    return this.request<ContextExplainResult>(`/datasets/${datasetId}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context_type: contextType,
        target_name: targetName,
        secondary_name: secondaryName,
        selected_rows_indices: selectedRowsIndices,
      }),
    });
  }

  async getSuggestedQuestions(datasetId: string): Promise<string[]> {
    return this.request<string[]>(`/datasets/${datasetId}/suggested-questions`);
  }

  async askQuestion(datasetId: string, question: string, contextColumn?: string): Promise<QuestionResult> {
    return this.request<QuestionResult>(`/datasets/${datasetId}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context_column: contextColumn }),
    });
  }

  // Insights
  async getRankedInsights(datasetId: string): Promise<RankedInsights> {
    return this.request<RankedInsights>(`/datasets/${datasetId}/insights`);
  }

  // Charts Data
  async getChartData(
    datasetId: string,
    chartType: string,
    xCol: string,
    yCol?: string,
    colorCol?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      chart_type: chartType,
      x_col: xCol,
    });
    if (yCol) params.append("y_col", yCol);
    if (colorCol) params.append("color_col", colorCol);
    return this.request<any>(`/datasets/${datasetId}/chart-data?${params.toString()}`);
  }
}

export const api = new ApiService();
