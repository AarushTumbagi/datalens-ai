import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from app.schemas.models import ColumnProfile, DatasetProfileResponse

class ProfilingService:
    @staticmethod
    def infer_column_type(series: pd.Series) -> str:
        if pd.api.types.is_numeric_dtype(series):
            # Check if boolean or binary
            non_null = series.dropna()
            if len(non_null) > 0 and non_null.isin([0, 1]).all() and non_null.nunique() <= 2:
                return "categorical"
            return "numerical"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        
        # Check if parseable as datetime
        non_null = series.dropna()
        if len(non_null) > 0 and len(non_null) <= 500:
            try:
                # Sample check
                sample = non_null.head(20).astype(str)
                pd.to_datetime(sample, errors="raise")
                return "datetime"
            except (ValueError, TypeError):
                pass
                
        # Distinguish categorical vs free text
        n_unique = non_null.nunique()
        n_total = len(non_null)
        if n_total > 0 and (n_unique / n_total < 0.25 or n_unique <= 50):
            return "categorical"
        return "text"

    @classmethod
    def profile_dataframe(cls, df: pd.DataFrame, dataset_id: str, filename: str) -> DatasetProfileResponse:
        row_count, col_count = df.shape
        duplicate_rows = int(df.duplicated().sum())
        duplicate_pct = round((duplicate_rows / row_count) * 100, 2) if row_count > 0 else 0.0
        
        total_cells = row_count * col_count
        missing_cells = int(df.isna().sum().sum())
        total_missing_pct = round((missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0.0
        
        columns_profile: List[ColumnProfile] = []
        warnings: List[str] = []
        
        if row_count < 15:
            warnings.append(f"Small dataset size ({row_count} rows). Statistical measures may have high variance.")
        if duplicate_rows > 0:
            warnings.append(f"Detected {duplicate_rows} duplicate rows ({duplicate_pct}% of dataset).")
        if total_missing_pct > 10.0:
            warnings.append(f"High overall missing data ({total_missing_pct}% of all data cells).")

        for col in df.columns:
            series = df[col]
            inferred_type = cls.infer_column_type(series)
            missing_count = int(series.isna().sum())
            missing_pct = round((missing_count / row_count) * 100, 2) if row_count > 0 else 0.0
            unique_count = int(series.nunique(dropna=True))
            is_constant = (unique_count <= 1)
            
            if is_constant:
                warnings.append(f"Column '{col}' is constant (only {unique_count} unique non-null value).")
            elif missing_pct > 30.0:
                warnings.append(f"Column '{col}' has {missing_pct}% missing values.")

            col_prof = ColumnProfile(
                name=str(col),
                inferred_type=inferred_type,
                raw_dtype=str(series.dtype),
                total_count=row_count,
                missing_count=missing_count,
                missing_pct=missing_pct,
                unique_count=unique_count,
                is_constant=is_constant
            )

            if inferred_type == "numerical":
                valid_num = pd.to_numeric(series.dropna(), errors="coerce").dropna()
                if len(valid_num) > 0:
                    q25 = float(valid_num.quantile(0.25))
                    q75 = float(valid_num.quantile(0.75))
                    iqr = q75 - q25
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    outliers = int(((valid_num < lower_bound) | (valid_num > upper_bound)).sum())
                    
                    col_prof.mean = round(float(valid_num.mean()), 4)
                    col_prof.std = round(float(valid_num.std()), 4) if len(valid_num) > 1 else 0.0
                    col_prof.min = round(float(valid_num.min()), 4)
                    col_prof.q25 = round(q25, 4)
                    col_prof.median = round(float(valid_num.median()), 4)
                    col_prof.q75 = round(q75, 4)
                    col_prof.max = round(float(valid_num.max()), 4)
                    col_prof.skewness = round(float(valid_num.skew()), 4) if len(valid_num) > 2 else 0.0
                    col_prof.outliers_count = outliers
                    
                    if outliers > 0:
                        outlier_pct = round((outliers / len(valid_num)) * 100, 1)
                        if outlier_pct >= 5.0:
                            warnings.append(f"Column '{col}' contains {outliers} outliers ({outlier_pct}% of values via IQR).")

                    # Generate 15 histogram bins for micro-charts
                    hist_counts, bin_edges = np.histogram(valid_num, bins=min(15, max(5, unique_count)))
                    bins_data = []
                    for i in range(len(hist_counts)):
                        bins_data.append({
                            "bin_start": round(float(bin_edges[i]), 2),
                            "bin_end": round(float(bin_edges[i+1]), 2),
                            "label": f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}",
                            "count": int(hist_counts[i])
                        })
                    col_prof.histogram_bins = bins_data

            elif inferred_type == "categorical":
                valid_cat = series.dropna().astype(str)
                top_counts = valid_cat.value_counts().head(8)
                col_prof.top_categories = [
                    {"label": str(cat), "count": int(count), "pct": round((count / len(valid_cat)) * 100, 1)}
                    for cat, count in top_counts.items()
                ]
                # Also generate histogram_bins format for uniform rendering
                col_prof.histogram_bins = [
                    {"label": str(cat), "count": int(count)}
                    for cat, count in top_counts.items()
                ]

            columns_profile.append(col_prof)

        return DatasetProfileResponse(
            dataset_id=dataset_id,
            filename=filename,
            row_count=row_count,
            column_count=col_count,
            duplicate_rows_count=duplicate_rows,
            duplicate_rows_pct=duplicate_pct,
            total_missing_cells=missing_cells,
            total_missing_pct=total_missing_pct,
            columns=columns_profile,
            warnings=warnings
        )
