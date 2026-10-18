from typing import List, Optional
import pandas as pd
from app.core.config import settings
from app.schemas.models import ContextExplainResponse, EvidenceItem
from app.services.profiling_service import ProfilingService
from app.services.statistics_service import StatisticsService

class ExplanationService:
    @classmethod
    def explain_context(
        cls,
        df: pd.DataFrame,
        context_type: str,
        target_name: Optional[str] = None,
        secondary_name: Optional[str] = None,
        selected_rows_indices: Optional[List[int]] = None,
        custom_focus: Optional[str] = None
    ) -> ContextExplainResponse:
        evidence: List[EvidenceItem] = []
        warnings: List[str] = []
        suggested_actions: List[str] = []

        if context_type == "dataset" or not target_name:
            rows, cols = df.shape
            missing_cells = int(df.isna().sum().sum())
            total_cells = rows * cols
            missing_pct = round((missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0
            dups = int(df.duplicated().sum())

            evidence.append(EvidenceItem(metric="Row Count", value=str(rows), context="Total observational units"))
            evidence.append(EvidenceItem(metric="Column Count", value=str(cols), context="Variables analyzed"))
            evidence.append(EvidenceItem(metric="Missingness", value=f"{missing_pct}% ({missing_cells} cells)", context="Dataset sparsity"))

            # Inspect skewness and high correlations
            num_cols = [c for c in df.columns if ProfilingService.infer_column_type(df[c]) == "numerical"]
            skewed = []
            for c in num_cols:
                s = pd.to_numeric(df[c], errors="coerce").dropna()
                if len(s) > 2 and abs(s.skew()) > 1.5:
                    skewed.append(c)

            headline = f"Dataset Profile: {rows} observations across {cols} dimensions"
            exp_parts = [
                f"This dataset contains {rows:,} records and {cols} attributes.",
                f"Overall data completeness is {100 - missing_pct:.1f}%."
            ]
            if dups > 0:
                warnings.append(f"Contains {dups} duplicate records ({round(dups/rows*100, 1)}%). Consider deduplication if rows represent identical events.")
            if skewed:
                exp_parts.append(f"Variables with notable distribution skewness include: {', '.join(skewed[:3])}.")
                suggested_actions.append(f"Inspect distribution histograms for {skewed[0]} in the Visualizations tab.")
            if len(num_cols) >= 2:
                suggested_actions.append("Explore the Relationship Graph to discover correlation clusters.")
                suggested_actions.append("Select an outcome variable in the What-If Lab to simulate scenario outcomes.")

            explanation = " ".join(exp_parts)

        elif context_type == "column" and target_name in df.columns:
            s = df[target_name]
            ctype = ProfilingService.infer_column_type(s)
            missing = int(s.isna().sum())
            missing_pct = round((missing / len(s)) * 100, 1)
            u_count = int(s.nunique(dropna=True))

            headline = f"Variable Analysis: '{target_name}' ({ctype.capitalize()})"
            evidence.append(EvidenceItem(metric="Data Type", value=ctype, context="Inferred classification"))
            evidence.append(EvidenceItem(metric="Unique Values", value=str(u_count), context="Distinct non-null entries"))
            evidence.append(EvidenceItem(metric="Missing Values", value=f"{missing} ({missing_pct}%)", context="Completeness"))

            if ctype == "numerical":
                nums = pd.to_numeric(s, errors="coerce").dropna()
                mean_val = float(nums.mean())
                median_val = float(nums.median())
                std_val = float(nums.std()) if len(nums) > 1 else 0
                q25, q75 = float(nums.quantile(0.25)), float(nums.quantile(0.75))
                iqr = q75 - q25
                outliers = int(((nums < q25 - 1.5 * iqr) | (nums > q75 + 1.5 * iqr)).sum())

                evidence.append(EvidenceItem(metric="Mean / Median", value=f"{mean_val:.2f} / {median_val:.2f}", context="Central tendency"))
                evidence.append(EvidenceItem(metric="Std Dev / IQR", value=f"{std_val:.2f} / {iqr:.2f}", context="Spread"))
                evidence.append(EvidenceItem(metric="Outliers", value=str(outliers), context="Values outside 1.5x IQR"))

                skew = nums.skew()
                shape = "roughly symmetric" if abs(skew) < 0.5 else ("moderately right-skewed" if skew > 0 else "moderately left-skewed")
                explanation = (
                    f"'{target_name}' is a continuous numerical variable with a {shape} distribution (skewness = {skew:.2f}). "
                    f"The median value is {median_val:.2f} with a standard deviation of {std_val:.2f}. "
                    f"There are {outliers} outlier points identified via IQR bounds."
                )
                if outliers > 0:
                    warnings.append(f"{outliers} outlier observations detected. Verify whether these represent extreme real phenomena or recording artifacts.")
                suggested_actions.append(f"Correlate '{target_name}' against other numerical variables in the Relationship tab.")
                suggested_actions.append(f"Examine a box plot or histogram in Visualization Studio.")
            else:
                top_v = s.dropna().value_counts().head(3)
                top_str = ", ".join([f"{k} ({v} occurrences)" for k, v in top_v.items()])
                evidence.append(EvidenceItem(metric="Top Categories", value=top_str, context="Frequency leaders"))
                explanation = (
                    f"'{target_name}' is a categorical variable with {u_count} distinct categories. "
                    f"The most frequent entries are {top_str}. "
                    f"Missing value rate is {missing_pct}%."
                )
                suggested_actions.append(f"Examine cross-tabulations or bar charts grouped by '{target_name}'.")

        elif context_type == "relationship" and target_name and secondary_name:
            pairwise = StatisticsService.get_pairwise_detail(df, target_name, secondary_name)
            headline = f"Relationship: {target_name} ↔ {secondary_name}"
            evidence.append(EvidenceItem(metric="Association Metric", value=f"{pairwise.metric_name} = {pairwise.metric_value}", context="Calculated strength"))
            evidence.append(EvidenceItem(metric="Valid Observations", value=str(pairwise.valid_n), context="Pairwise complete records"))
            if pairwise.p_value is not None:
                evidence.append(EvidenceItem(metric="p-value", value=str(pairwise.p_value), context="Statistical significance"))

            explanation = pairwise.interpretation + f" Based on {pairwise.valid_n:,} pairwise complete observations."
            warnings.append(pairwise.limitations)
            suggested_actions.append(f"Plot a scatter plot with regression trendline between {target_name} and {secondary_name}.")
            suggested_actions.append(f"Test whether {target_name} provides predictive power for {secondary_name} in the What-If Lab.")

        elif context_type == "selection" and selected_rows_indices:
            sel_df = df.iloc[selected_rows_indices]
            sel_count = len(sel_df)
            headline = f"Cohort Analysis: {sel_count} Selected Records"
            evidence.append(EvidenceItem(metric="Selection Size", value=f"{sel_count} rows ({round(sel_count/len(df)*100, 1)}% of dataset)", context="Selected subset"))

            explanation = (
                f"You have isolated {sel_count} records. Across this cohort, distributions can be compared against the global baseline. "
                f"Use this subset to investigate specific clusters, outlier groups, or temporal spikes."
            )
            suggested_actions.append("Compare cohort averages against dataset-wide averages.")
        else:
            headline = "Context Explanation"
            explanation = "Select any table cell, variable node, edge, or chart point to view grounded analytical explanations."

        return ContextExplainResponse(
            headline=headline,
            explanation=explanation,
            evidence=evidence,
            warnings=warnings,
            suggested_actions=suggested_actions,
            provider="deterministic"
        )
