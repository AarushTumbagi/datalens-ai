import re
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from app.schemas.models import QuestionResponse
from app.services.profiling_service import ProfilingService
from app.services.statistics_service import StatisticsService

class QuestionService:
    @classmethod
    def get_suggested_questions(cls, df: pd.DataFrame) -> List[str]:
        cols = list(df.columns)
        num_cols = [c for c in cols if ProfilingService.infer_column_type(df[c]) == "numerical"]
        cat_cols = [c for c in cols if ProfilingService.infer_column_type(df[c]) == "categorical"]
        time_cols = [c for c in cols if ProfilingService.infer_column_type(df[c]) == "datetime" or "time" in c.lower() or "date" in c.lower()]

        questions = []
        if num_cols and time_cols:
            questions.append(f"How does {num_cols[0]} vary over time?")
        if len(num_cols) >= 2:
            questions.append(f"Is there a correlation between {num_cols[0]} and {num_cols[1]}?")
        if num_cols and cat_cols:
            questions.append(f"Which {cat_cols[0]} has the highest average {num_cols[0]}?")
        if num_cols:
            questions.append(f"What are the outliers or extreme values in {num_cols[0]}?")
            questions.append(f"What is the median and distribution of {num_cols[0]}?")
        if cat_cols:
            questions.append(f"What is the most frequent {cat_cols[0]} in the dataset?")

        # Add general exploratory questions
        questions.append("Which variables have the strongest relationships?")
        questions.append("Are missing values concentrated in any specific columns?")
        return questions[:6]

    @classmethod
    def answer_question(cls, df: pd.DataFrame, question: str, context_col: Optional[str] = None) -> QuestionResponse:
        q_lower = question.lower().strip()
        num_cols = [c for c in df.columns if ProfilingService.infer_column_type(df[c]) == "numerical"]
        cat_cols = [c for c in cols if ProfilingService.infer_column_type(df[c]) == "categorical"] if 'cols' in locals() else [c for c in df.columns if ProfilingService.infer_column_type(df[c]) == "categorical"]

        # 1. Missing values inquiry
        if "missing" in q_lower or "null" in q_lower or "nan" in q_lower:
            missing_series = df.isna().sum()
            missing_df = pd.DataFrame({
                "column": missing_series.index,
                "missing_count": missing_series.values,
                "missing_pct": np.round((missing_series.values / len(df)) * 100, 2)
            }).sort_values(by="missing_count", ascending=False)
            
            top_missing = missing_df[missing_df["missing_count"] > 0]
            if len(top_missing) == 0:
                return QuestionResponse(
                    question=question,
                    interpreted_operation="audit_missing_values",
                    answer="There are no missing values in this dataset. All columns are 100% complete.",
                    confidence="High"
                )
            else:
                table = top_missing.head(10).to_dict(orient="records")
                ans = f"Missing values are found in {len(top_missing)} columns. Highest missingness is in '{top_missing.iloc[0]['column']}' with {top_missing.iloc[0]['missing_pct']}% missing data."
                return QuestionResponse(
                    question=question,
                    interpreted_operation="audit_missing_values",
                    answer=ans,
                    evidence_table=table,
                    confidence="High"
                )

        # 2. Strongest relationships / correlations
        if "strongest" in q_lower or "relationship" in q_lower or "correlation" in q_lower:
            graph = StatisticsService.compute_relationship_graph(df, "active", threshold=0.1)
            if graph.edges:
                sorted_edges = sorted(graph.edges, key=lambda e: e.abs_value, reverse=True)[:5]
                table = [
                    {
                        "Variable 1": e.source,
                        "Variable 2": e.target,
                        "Metric": e.metric,
                        "Value": e.value,
                        "Observations": e.valid_observations
                    }
                    for e in sorted_edges
                ]
                top = sorted_edges[0]
                ans = f"The strongest measured relationship is between '{top.source}' and '{top.target}' with a {top.metric} of {top.value:.3f} ({top.valid_observations:,} observations)."
                return QuestionResponse(
                    question=question,
                    interpreted_operation="find_strongest_correlations",
                    answer=ans,
                    evidence_table=table,
                    confidence="High"
                )

        # 3. Highest / lowest group average
        if ("highest" in q_lower or "lowest" in q_lower or "average" in q_lower) and cat_cols and num_cols:
            # Detect target column in question
            matched_num = next((c for c in num_cols if c.lower() in q_lower), num_cols[0])
            matched_cat = next((c for c in cat_cols if c.lower() in q_lower), cat_cols[0])
            
            agg = df.groupby(matched_cat)[matched_num].agg(["mean", "median", "count"]).reset_index()
            ascending = "lowest" in q_lower
            agg = agg.sort_values(by="mean", ascending=ascending)
            top_row = agg.iloc[0]
            
            table = agg.head(8).rename(columns={
                "mean": f"Mean {matched_num}",
                "median": f"Median {matched_num}",
                "count": "Record Count"
            }).to_dict(orient="records")
            
            direction_word = "lowest" if ascending else "highest"
            ans = f"'{top_row[matched_cat]}' has the {direction_word} average {matched_num} at {top_row['mean']:.2f} (median: {top_row['median']:.2f}, n={int(top_row['count'])})."
            
            return QuestionResponse(
                question=question,
                interpreted_operation="group_by_aggregation",
                answer=ans,
                evidence_table=table,
                chart_config={
                    "type": "bar",
                    "x_col": matched_cat,
                    "y_col": f"Mean {matched_num}"
                },
                confidence="High"
            )

        # 4. Outliers detection
        if "outlier" in q_lower or "extreme" in q_lower:
            matched_num = next((c for c in num_cols if c.lower() in q_lower), num_cols[0] if num_cols else None)
            if matched_num:
                s = pd.to_numeric(df[matched_num], errors="coerce").dropna()
                q25, q75 = s.quantile(0.25), s.quantile(0.75)
                iqr = q75 - q25
                lower, upper = q25 - 1.5 * iqr, q75 + 1.5 * iqr
                outliers_df = df[(df[matched_num] < lower) | (df[matched_num] > upper)]
                n_out = len(outliers_df)
                
                table = outliers_df.head(6).to_dict(orient="records")
                ans = f"Identified {n_out} outlier records for '{matched_num}' outside the IQR interval [{lower:.2f}, {upper:.2f}]."
                return QuestionResponse(
                    question=question,
                    interpreted_operation="detect_outliers",
                    answer=ans,
                    evidence_table=table,
                    confidence="High"
                )

        # 5. Median / Mean / Distribution
        if "median" in q_lower or "mean" in q_lower or "average" in q_lower or "distribution" in q_lower:
            matched_num = next((c for c in num_cols if c.lower() in q_lower), num_cols[0] if num_cols else None)
            if matched_num:
                s = pd.to_numeric(df[matched_num], errors="coerce").dropna()
                ans = f"For '{matched_num}': Mean = {s.mean():.2f}, Median = {s.median():.2f}, Standard Deviation = {s.std():.2f}, Min = {s.min():.2f}, Max = {s.max():.2f} across {len(s):,} valid records."
                table = [{
                    "Metric": "Mean", "Value": round(float(s.mean()), 2)
                }, {
                    "Metric": "Median", "Value": round(float(s.median()), 2)
                }, {
                    "Metric": "Std Dev", "Value": round(float(s.std()), 2)
                }, {
                    "Metric": "IQR", "Value": round(float(s.quantile(0.75) - s.quantile(0.25)), 2)
                }]
                return QuestionResponse(
                    question=question,
                    interpreted_operation="compute_descriptive_stats",
                    answer=ans,
                    evidence_table=table,
                    confidence="High"
                )

        # Fallback interpretation
        ans = (
            f"Analyzed question '{question}'. The dataset contains {len(df)} rows and {len(df.columns)} columns. "
            f"You can ask about column averages, correlations, missing values, group comparisons, or outliers."
        )
        return QuestionResponse(
            question=question,
            interpreted_operation="general_query",
            answer=ans,
            confidence="Moderate"
        )
