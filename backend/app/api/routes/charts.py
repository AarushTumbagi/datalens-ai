from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from app.services.file_loader import FileLoaderService
from app.services.profiling_service import ProfilingService

router = APIRouter(prefix="/datasets", tags=["charts"])

@router.get("/{dataset_id}/chart-data")
def get_chart_data(
    dataset_id: str,
    chart_type: str = Query(..., pattern="^(histogram|scatter|bar|line|box)$"),
    x_col: str = Query(...),
    y_col: str = Query(None),
    color_col: str = Query(None),
    max_points: int = Query(600, ge=50, le=2000)
):
    df, _ = FileLoaderService.get_dataset(dataset_id)
    if x_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{x_col}' not found.")
    if y_col and y_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{y_col}' not found.")

    t_x = ProfilingService.infer_column_type(df[x_col])
    t_y = ProfilingService.infer_column_type(df[y_col]) if y_col else None

    # Chart 1: Histogram
    if chart_type == "histogram":
        if t_x == "numerical":
            s = pd.to_numeric(df[x_col], errors="coerce").dropna()
            if len(s) == 0:
                return {"chart_type": "histogram", "x_col": x_col, "bins": []}
            counts, bin_edges = np.histogram(s, bins=min(20, max(5, s.nunique())))
            return {
                "chart_type": "histogram",
                "x_col": x_col,
                "min": round(float(s.min()), 2),
                "max": round(float(s.max()), 2),
                "mean": round(float(s.mean()), 2),
                "median": round(float(s.median()), 2),
                "bins": [
                    {
                        "x": round(float(bin_edges[i]), 2),
                        "x_end": round(float(bin_edges[i+1]), 2),
                        "label": f"{round(bin_edges[i], 1)} - {round(bin_edges[i+1], 1)}",
                        "y": int(counts[i])
                    }
                    for i in range(len(counts))
                ]
            }
        else:
            vc = df[x_col].dropna().astype(str).value_counts().head(15)
            return {
                "chart_type": "bar",
                "x_col": x_col,
                "data": [{"x": str(k), "y": int(v)} for k, v in vc.items()]
            }

    # Chart 2: Scatter plot
    if chart_type == "scatter":
        if not y_col:
            raise HTTPException(status_code=400, detail="Scatter plot requires y_col.")
        
        # Convert numeric and drop NA
        s_x = pd.to_numeric(df[x_col], errors="coerce")
        s_y = pd.to_numeric(df[y_col], errors="coerce")
        valid_mask = s_x.notna() & s_y.notna()
        
        if valid_mask.sum() == 0:
            return {
                "chart_type": "scatter",
                "x_col": x_col,
                "y_col": y_col,
                "points": [],
                "total_points": 0
            }
            
        plot_df = pd.DataFrame({
            x_col: s_x[valid_mask],
            y_col: s_y[valid_mask]
        })
        
        if color_col and color_col in df.columns:
            plot_df[color_col] = df[color_col][valid_mask].astype(str)

        if len(plot_df) > max_points:
            plot_df = plot_df.sample(max_points, random_state=42)

        points = plot_df.to_dict(orient="records")
        min_x, max_x = float(s_x[valid_mask].min()), float(s_x[valid_mask].max())
        min_y, max_y = float(s_y[valid_mask].min()), float(s_y[valid_mask].max())

        return {
            "chart_type": "scatter",
            "x_col": x_col,
            "y_col": y_col,
            "color_col": color_col,
            "min_x": min_x,
            "max_x": max_x,
            "min_y": min_y,
            "max_y": max_y,
            "points": points,
            "total_points": int(valid_mask.sum())
        }

    # Chart 3: Bar chart (Aggregation)
    if chart_type == "bar":
        if y_col and t_y == "numerical":
            s_y = pd.to_numeric(df[y_col], errors="coerce")
            valid = df.copy()
            valid["_num_y"] = s_y
            valid = valid.dropna(subset=["_num_y", x_col])
            agg = valid.groupby(x_col)["_num_y"].agg(["mean", "count"]).reset_index()
            agg = agg.sort_values(by="mean", ascending=False).head(20)
            data = [{"x": str(row[x_col]), "y": round(float(row["mean"]), 2), "count": int(row["count"])} for _, row in agg.iterrows()]
            return {"chart_type": "bar", "x_col": x_col, "y_col": f"Mean {y_col}", "data": data}
        else:
            vc = df[x_col].dropna().astype(str).value_counts().head(20)
            return {"chart_type": "bar", "x_col": x_col, "y_col": "Count", "data": [{"x": str(k), "y": int(v)} for k, v in vc.items()]}

    # Chart 4: Line chart
    if chart_type == "line":
        if not y_col:
            raise HTTPException(status_code=400, detail="Line chart requires y_col.")
        s_y = pd.to_numeric(df[y_col], errors="coerce")
        valid = pd.DataFrame({"x": df[x_col], "y": s_y}).dropna().head(max_points)
        return {
            "chart_type": "line",
            "x_col": x_col,
            "y_col": y_col,
            "data": [{"x": str(row["x"]), "y": round(float(row["y"]), 2)} for _, row in valid.iterrows()]
        }

    # Chart 5: Box plot
    if chart_type == "box":
        clean_num = pd.to_numeric(df[x_col], errors="coerce").dropna()
        if len(clean_num) == 0:
            return {"chart_type": "box", "stats": {}}
        return {
            "chart_type": "box",
            "x_col": x_col,
            "stats": {
                "min": round(float(clean_num.min()), 2),
                "q25": round(float(clean_num.quantile(0.25)), 2),
                "median": round(float(clean_num.median()), 2),
                "q75": round(float(clean_num.quantile(0.75)), 2),
                "max": round(float(clean_num.max()), 2),
                "mean": round(float(clean_num.mean()), 2)
            }
        }
