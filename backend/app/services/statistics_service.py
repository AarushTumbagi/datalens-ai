import math
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.models import (
    GraphNode, GraphEdge, RelationshipGraphResponse, PairwiseDetailResponse
)
from app.services.profiling_service import ProfilingService

def _compute_chi2_contingency(confusion_matrix: pd.DataFrame) -> float:
    obs = np.asarray(confusion_matrix, dtype=float)
    r_sum = obs.sum(axis=1, keepdims=True)
    c_sum = obs.sum(axis=0, keepdims=True)
    tot = obs.sum()
    if tot == 0:
        return 0.0
    exp = (r_sum @ c_sum) / tot
    mask = exp > 0
    chi2 = np.sum((obs[mask] - exp[mask]) ** 2 / exp[mask])
    return float(chi2)

def _compute_pearson(s1: pd.Series, s2: pd.Series) -> Tuple[float, float]:
    r = float(s1.corr(s2))
    n = len(s1)
    if n <= 2 or abs(r) >= 1.0 or np.isnan(r):
        return (0.0 if np.isnan(r) else r), 1.0
    t_val = r * math.sqrt((n - 2) / max(1e-12, 1.0 - r**2))
    p = math.erfc(abs(t_val) / math.sqrt(2))
    return r, float(min(1.0, max(0.0, p)))

def _compute_spearman(s1: pd.Series, s2: pd.Series) -> Tuple[float, float]:
    rho = float(s1.corr(s2, method="spearman"))
    return (0.0 if np.isnan(rho) else rho), 0.0

class StatisticsService:
    @staticmethod
    def calculate_cramers_v(cat1: pd.Series, cat2: pd.Series) -> Tuple[float, int]:
        confusion_matrix = pd.crosstab(cat1, cat2)
        valid_n = confusion_matrix.sum().sum()
        if valid_n == 0:
            return 0.0, 0
            
        chi2 = _compute_chi2_contingency(confusion_matrix)
        n = confusion_matrix.sum().sum()
        phi2 = chi2 / n
        r, k = confusion_matrix.shape
        
        # Bergsma and Wicher correction
        phi2corr = max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1)) if n > 1 else 0
        rcorr = r - ((r - 1)**2) / (n - 1) if n > 1 else r
        kcorr = k - ((k - 1)**2) / (n - 1) if n > 1 else k
        
        min_dim = min((kcorr - 1), (rcorr - 1))
        if min_dim <= 0:
            return 0.0, int(valid_n)
            
        v = np.sqrt(phi2corr / min_dim)
        return float(min(1.0, max(0.0, v))), int(valid_n)

    @staticmethod
    def calculate_correlation_ratio(categories: pd.Series, measurements: pd.Series) -> Tuple[float, int]:
        df_valid = pd.DataFrame({"cat": categories, "num": measurements}).dropna()
        valid_n = len(df_valid)
        if valid_n < 3:
            return 0.0, valid_n
            
        cat_counts = df_valid["cat"].value_counts()
        valid_cats = cat_counts[cat_counts >= 2].index
        df_filtered = df_valid[df_valid["cat"].isin(valid_cats)]
        if len(df_filtered["cat"].unique()) < 2:
            return 0.0, valid_n

        overall_mean = df_filtered["num"].mean()
        ss_total = ((df_filtered["num"] - overall_mean) ** 2).sum()
        if ss_total == 0:
            return 0.0, valid_n

        ss_between = sum(
            len(group) * ((group["num"].mean() - overall_mean) ** 2)
            for _, group in df_filtered.groupby("cat")
        )
        eta = np.sqrt(ss_between / ss_total)
        return float(min(1.0, max(0.0, eta))), valid_n

    @classmethod
    def compute_relationship_graph(
        cls, df: pd.DataFrame, dataset_id: str, threshold: float = 0.25
    ) -> RelationshipGraphResponse:
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        
        columns = list(df.columns)
        col_types = {col: ProfilingService.infer_column_type(df[col]) for col in columns}
        
        # Build nodes
        for col in columns:
            series = df[col]
            t = col_types[col]
            missing_pct = round(float(series.isna().mean() * 100), 2)
            u_count = int(series.nunique(dropna=True))
            
            node_stats: Dict[str, Any] = {}
            if t == "numerical":
                v = pd.to_numeric(series, errors="coerce").dropna()
                if len(v) > 0:
                    node_stats = {
                        "mean": round(float(v.mean()), 2),
                        "median": round(float(v.median()), 2),
                        "min": round(float(v.min()), 2),
                        "max": round(float(v.max()), 2),
                        "std": round(float(v.std()), 2) if len(v) > 1 else 0
                    }
            elif t == "categorical":
                v = series.dropna().astype(str)
                node_stats = {
                    "top_category": str(v.mode()[0]) if len(v) > 0 else "N/A",
                    "top_freq": int(v.value_counts().iloc[0]) if len(v) > 0 else 0
                }
                
            nodes.append(GraphNode(
                id=str(col),
                label=str(col),
                type=t,
                missing_pct=missing_pct,
                unique_count=u_count,
                stats=node_stats
            ))

        total_pairs = 0
        connected_pairs = 0
        
        # Compute pairwise relationships
        for i in range(len(columns)):
            for j in range(i + 1, len(columns)):
                col1 = columns[i]
                col2 = columns[j]
                t1 = col_types[col1]
                t2 = col_types[col2]
                total_pairs += 1

                # Skip constant columns
                if df[col1].nunique(dropna=True) <= 1 or df[col2].nunique(dropna=True) <= 1:
                    continue

                metric = "unknown"
                val = 0.0
                p_val: Optional[float] = None
                direction: Optional[str] = None
                valid_n = 0
                interpretation = ""

                # Numerical vs Numerical
                if t1 == "numerical" and t2 == "numerical":
                    valid_data = df[[col1, col2]].dropna()
                    valid_n = len(valid_data)
                    if valid_n >= 4:
                        s1 = pd.to_numeric(valid_data[col1], errors="coerce")
                        s2 = pd.to_numeric(valid_data[col2], errors="coerce")
                        valid_mask = s1.notna() & s2.notna()
                        s1, s2 = s1[valid_mask], s2[valid_mask]
                        valid_n = len(s1)
                        if valid_n >= 4 and s1.std() > 0 and s2.std() > 0:
                            r, p = _compute_pearson(s1, s2)
                            spearman_rho, _ = _compute_spearman(s1, s2)
                            metric = "pearson"
                            val = float(r) if not np.isnan(r) else 0.0
                            p_val = float(p) if not np.isnan(p) else None
                            direction = "positive" if val > 0 else "negative"
                            strength = "strong" if abs(val) >= 0.7 else ("moderate" if abs(val) >= 0.4 else "weak")
                            interpretation = f"{strength.capitalize()} linear association (r = {val:.2f}, Spearman ρ = {spearman_rho:.2f})."
                
                # Categorical vs Categorical
                elif t1 == "categorical" and t2 == "categorical":
                    v, valid_n = cls.calculate_cramers_v(df[col1].dropna().astype(str), df[col2].dropna().astype(str))
                    metric = "cramers_v"
                    val = v
                    direction = "association"
                    strength = "strong" if val >= 0.5 else ("moderate" if val >= 0.25 else "weak")
                    interpretation = f"{strength.capitalize()} nominal categorical association (Cramér's V = {val:.2f})."
                
                # Numerical vs Categorical
                elif (t1 == "numerical" and t2 == "categorical") or (t1 == "categorical" and t2 == "numerical"):
                    num_col = col1 if t1 == "numerical" else col2
                    cat_col = col2 if t1 == "numerical" else col1
                    eta, valid_n = cls.calculate_correlation_ratio(df[cat_col].astype(str), pd.to_numeric(df[num_col], errors="coerce"))
                    metric = "correlation_ratio"
                    val = eta
                    direction = "association"
                    strength = "strong" if val >= 0.5 else ("moderate" if val >= 0.25 else "weak")
                    interpretation = f"{strength.capitalize()} group variance relationship (η = {val:.2f})."

                abs_val = abs(val)
                if abs_val >= threshold and metric != "unknown":
                    connected_pairs += 1
                    edges.append(GraphEdge(
                        id=f"{col1}__{col2}",
                        source=col1,
                        target=col2,
                        metric=metric,
                        value=round(val, 3),
                        abs_value=round(abs_val, 3),
                        direction=direction,
                        p_value=round(p_val, 5) if p_val is not None else None,
                        valid_observations=valid_n,
                        interpretation=interpretation
                    ))

        return RelationshipGraphResponse(
            dataset_id=dataset_id,
            nodes=nodes,
            edges=edges,
            threshold=threshold,
            total_possible_pairs=total_pairs,
            connected_pairs=connected_pairs
        )

    @classmethod
    def get_pairwise_detail(cls, df: pd.DataFrame, var1: str, var2: str) -> PairwiseDetailResponse:
        t1 = ProfilingService.infer_column_type(df[var1])
        t2 = ProfilingService.infer_column_type(df[var2])
        
        valid_df = df[[var1, var2]].dropna()
        valid_n = len(valid_df)
        
        # Sample points for scatter plot up to 400 points
        if valid_n > 400:
            sample_df = valid_df.sample(400, random_state=42)
        else:
            sample_df = valid_df
            
        scatter_sample = sample_df.to_dict(orient="records")
        trend_line = None
        
        metric_name = "Association"
        metric_value = 0.0
        p_val = None
        interpretation = "Analysis completed."
        limitations = "Correlation does not imply causation. Observed association may be confounded by unobserved variables."

        if t1 == "numerical" and t2 == "numerical":
            s1 = pd.to_numeric(valid_df[var1], errors="coerce").dropna()
            s2 = pd.to_numeric(valid_df[var2], errors="coerce").dropna()
            common_idx = s1.index.intersection(s2.index)
            s1, s2 = s1.loc[common_idx], s2.loc[common_idx]
            valid_n = len(s1)
            
            if valid_n >= 3 and s1.std() > 0 and s2.std() > 0:
                r, p = _compute_pearson(s1, s2)
                metric_name = "Pearson Correlation (r)"
                metric_value = round(float(r), 4)
                p_val = round(float(p), 6)
                
                # Fit linear trend line
                slope, intercept = np.polyfit(s1, s2, 1)
                x_min, x_max = float(s1.min()), float(s1.max())
                trend_line = {
                    "slope": round(float(slope), 4),
                    "intercept": round(float(intercept), 4),
                    "x_start": x_min,
                    "y_start": round(float(slope * x_min + intercept), 4),
                    "x_end": x_max,
                    "y_end": round(float(slope * x_max + intercept), 4)
                }
                
                direction = "positive" if r > 0 else "negative"
                strength = "strong" if abs(r) >= 0.7 else ("moderate" if abs(r) >= 0.4 else "weak")
                interpretation = f"Statistically {'significant' if p < 0.05 else 'non-significant'} {strength} {direction} correlation (r={r:.3f}, p={p:.4f})."
                limitations = "Measures only linear relationship. Outliers or non-linear patterns can distort this metric."

        elif t1 == "categorical" and t2 == "categorical":
            v, valid_n = cls.calculate_cramers_v(valid_df[var1].astype(str), valid_df[var2].astype(str))
            metric_name = "Cramér's V"
            metric_value = round(v, 4)
            interpretation = f"Measure of nominal association between categories (V={v:.3f})."
            limitations = "Indicates degree of association between discrete classes; sensitive to sparse categories."

        else:
            num_var = var1 if t1 == "numerical" else var2
            cat_var = var2 if t1 == "numerical" else var1
            eta, valid_n = cls.calculate_correlation_ratio(valid_df[cat_var].astype(str), pd.to_numeric(valid_df[num_var], errors="coerce"))
            metric_name = "Correlation Ratio (η)"
            metric_value = round(eta, 4)
            interpretation = f"Proportion of variance in {num_var} explained by categories of {cat_var} (η={eta:.3f})."
            limitations = "Asymmetric metric; reflects how well categorical groups predict the continuous variable."

        return PairwiseDetailResponse(
            var1=var1,
            var2=var2,
            metric_name=metric_name,
            metric_value=metric_value,
            p_value=p_val,
            valid_n=valid_n,
            interpretation=interpretation,
            limitations=limitations,
            scatter_sample=scatter_sample,
            trend_line=trend_line
        )
