import gzip
import pickle
import uuid
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

from app.core.config import settings
from app.core.errors import ModelFittingError
from app.schemas.models import (
    TrainModelResponse, ModelEvaluationMetrics,
    PredictScenarioResponse, SensitivityResponse
)
from app.services.profiling_service import ProfilingService

_FITTED_MODELS: Dict[str, Dict[str, Any]] = {}

def _get_model_data(model_id: str) -> Dict[str, Any]:
    if model_id in _FITTED_MODELS:
        return _FITTED_MODELS[model_id]
    
    # Check /tmp storage
    model_dir = settings.STORAGE_DIR / "models"
    model_path = model_dir / f"{model_id}.pkl.gz"
    if model_path.exists():
        try:
            with gzip.open(model_path, "rb") as f:
                data = pickle.load(f)
                _FITTED_MODELS[model_id] = data
                return data
        except Exception:
            pass
            
    raise ModelFittingError("Fitted model not found or serverless session expired. Please re-fit the model.")

class ModelingService:
    @classmethod
    def train_model(
        cls, df: pd.DataFrame, dataset_id: str, target_col: str, feature_cols: List[str], model_type: str = "ridge"
    ) -> TrainModelResponse:
        if target_col not in df.columns:
            raise ModelFittingError(f"Target column '{target_col}' not found in dataset.")
        
        target_type = ProfilingService.infer_column_type(df[target_col])
        if target_type != "numerical":
            raise ModelFittingError(f"Target column '{target_col}' must be a numerical continuous variable for regression.")

        valid_features = [f for f in feature_cols if f in df.columns and f != target_col]
        if not valid_features:
            raise ModelFittingError("At least one valid feature column must be selected.")

        # Clean target nulls
        clean_df = df.dropna(subset=[target_col]).copy()
        if len(clean_df) < 15:
            raise ModelFittingError(f"Insufficient non-null rows ({len(clean_df)}) for training a model (minimum 15 required).")

        X = clean_df[valid_features]
        y = pd.to_numeric(clean_df[target_col], errors="coerce")
        valid_mask = y.notna()
        X = X[valid_mask]
        y = y[valid_mask]

        if y.nunique() <= 1:
            raise ModelFittingError(f"Target '{target_col}' is constant with only {y.nunique()} unique value.")

        # Separate feature types
        num_features = []
        cat_features = []
        for col in valid_features:
            t = ProfilingService.infer_column_type(X[col])
            if t == "numerical":
                num_features.append(col)
            elif t == "categorical":
                cat_features.append(col)

        if not num_features and not cat_features:
            raise ModelFittingError("No usable numerical or categorical features detected.")

        transformers = []
        if num_features:
            num_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler())
            ])
            transformers.append(("num", num_pipe, num_features))

        if cat_features:
            cat_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
            ])
            transformers.append(("cat", cat_pipe, cat_features))

        preprocessor = ColumnTransformer(transformers=transformers)

        if model_type == "elastic_net":
            regressor = ElasticNet(alpha=0.5, l1_ratio=0.5, random_state=42)
        elif model_type == "random_forest":
            regressor = RandomForestRegressor(n_estimators=60, max_depth=6, random_state=42)
        else:
            regressor = Ridge(alpha=1.0)

        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", regressor)
        ])

        # Train/Test Split
        test_size = max(5, int(len(X) * 0.2))
        train_size = len(X) - test_size
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # Fit strictly on train split
        pipeline.fit(X_train, y_train)

        # Evaluate on test split
        y_pred = pipeline.predict(X_test)
        r2 = float(r2_score(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        mae = float(mean_absolute_error(y_test, y_pred))

        # Cross-validation
        cv_folds = min(5, max(2, len(X_train) // 10))
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv_folds, scoring="r2")
        cv_mean = float(cv_scores.mean())
        cv_std = float(cv_scores.std())

        # Extract feature importances
        feature_names = []
        if hasattr(pipeline.named_steps["preprocessor"], "get_feature_names_out"):
            try:
                feature_names = list(pipeline.named_steps["preprocessor"].get_feature_names_out())
            except Exception:
                feature_names = valid_features

        importances = []
        if hasattr(regressor, "coef_"):
            raw_weights = np.abs(regressor.coef_)
            total_w = raw_weights.sum() if raw_weights.sum() > 0 else 1.0
            norm_weights = raw_weights / total_w
            for fn, nw in zip(feature_names[:len(norm_weights)], norm_weights):
                clean_name = fn.replace("num__", "").replace("cat__", "")
                importances.append({"feature": clean_name, "importance": round(float(nw), 4)})
        elif hasattr(regressor, "feature_importances_"):
            for fn, fi in zip(feature_names[:len(regressor.feature_importances_)], regressor.feature_importances_):
                clean_name = fn.replace("num__", "").replace("cat__", "")
                importances.append({"feature": clean_name, "importance": round(float(fi), 4)})

        # Aggregate importances by original feature column
        col_importances_map = {}
        for imp in importances:
            feat = imp["feature"].split("_")[0]
            col_importances_map[feat] = col_importances_map.get(feat, 0.0) + imp["importance"]

        agg_importances = [
            {"feature": k, "importance": round(v, 4)}
            for k, v in sorted(col_importances_map.items(), key=lambda item: item[1], reverse=True)
        ]

        # Compute baseline inputs and baseline prediction
        baseline_inputs = {}
        feature_ranges = {}
        for col in valid_features:
            if col in num_features:
                val = float(pd.to_numeric(X[col], errors="coerce").median())
                baseline_inputs[col] = round(val, 2)
                v_min = float(pd.to_numeric(X[col], errors="coerce").min())
                v_max = float(pd.to_numeric(X[col], errors="coerce").max())
                feature_ranges[col] = {"type": "numerical", "min": v_min, "max": v_max}
            else:
                mode_val = str(X[col].mode().iloc[0]) if len(X[col].mode()) > 0 else ""
                baseline_inputs[col] = mode_val
                cats = list(X[col].dropna().unique())[:10]
                feature_ranges[col] = {"type": "categorical", "categories": [str(c) for c in cats]}

        # Predict baseline
        baseline_df = pd.DataFrame([baseline_inputs])
        baseline_pred = float(pipeline.predict(baseline_df)[0])

        warnings = []
        if r2 < 0.2:
            warnings.append(f"Model has low explanatory power (R² = {r2:.2f}). Predictions should be interpreted with caution.")
        if len(clean_df) < 50:
            warnings.append("Small sample size may lead to prediction uncertainty on unseen inputs.")

        model_id = str(uuid.uuid4())
        model_payload = {
            "pipeline": pipeline,
            "target_column": target_col,
            "feature_columns": valid_features,
            "num_features": num_features,
            "cat_features": cat_features,
            "baseline_inputs": baseline_inputs,
            "baseline_pred": baseline_pred,
            "feature_ranges": feature_ranges,
            "metrics": {
                "r2_score": round(r2, 4),
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "cv_r2_mean": round(cv_mean, 4),
                "cv_r2_std": round(cv_std, 4),
                "test_size": test_size,
                "train_size": train_size
            }
        }
        _FITTED_MODELS[model_id] = model_payload

        # Persist to /tmp for cross-invocation recovery
        try:
            model_dir = settings.STORAGE_DIR / "models"
            model_dir.mkdir(parents=True, exist_ok=True)
            with gzip.open(model_dir / f"{model_id}.pkl.gz", "wb") as f:
                pickle.dump(model_payload, f)
        except Exception:
            pass

        return TrainModelResponse(
            model_id=model_id,
            dataset_id=dataset_id,
            target_column=target_col,
            feature_columns=valid_features,
            model_type=model_type,
            metrics=ModelEvaluationMetrics(
                r2_score=round(r2, 4),
                rmse=round(rmse, 4),
                mae=round(mae, 4),
                cv_r2_mean=round(cv_mean, 4),
                cv_r2_std=round(cv_std, 4),
                test_size=test_size,
                train_size=train_size
            ),
            feature_importances=agg_importances,
            baseline_inputs=baseline_inputs,
            baseline_prediction=round(baseline_pred, 4),
            warnings=warnings
        )

    @classmethod
    def predict_scenario(cls, model_id: str, inputs: Dict[str, Any]) -> PredictScenarioResponse:
        model_data = _get_model_data(model_id)
        pipeline = model_data["pipeline"]
        feature_cols = model_data["feature_columns"]
        baseline_inputs = model_data["baseline_inputs"]
        baseline_pred = model_data["baseline_pred"]
        ranges = model_data["feature_ranges"]

        # Fill missing inputs with baseline
        merged_inputs = {col: inputs.get(col, baseline_inputs.get(col)) for col in feature_cols}
        input_df = pd.DataFrame([merged_inputs])

        pred = float(pipeline.predict(input_df)[0])
        delta_abs = round(pred - baseline_pred, 4)
        delta_rel = round((delta_abs / abs(baseline_pred)) * 100, 2) if baseline_pred != 0 else None

        # Extrapolation checks
        is_extrapolating = False
        warnings = []
        for col, meta in ranges.items():
            if meta["type"] == "numerical" and col in merged_inputs:
                try:
                    val = float(merged_inputs[col])
                    vmin, vmax = meta["min"], meta["max"]
                    margin = (vmax - vmin) * 0.10
                    if val < (vmin - margin) or val > (vmax + margin):
                        is_extrapolating = True
                        warnings.append(f"Input '{col}' = {val} is outside the observed training domain [{vmin:.1f}, {vmax:.1f}]. Prediction may be unreliable.")
                except Exception:
                    pass

        return PredictScenarioResponse(
            model_id=model_id,
            prediction=round(pred, 4),
            baseline_prediction=round(baseline_pred, 4),
            delta_absolute=delta_abs,
            delta_relative_pct=delta_rel,
            is_extrapolating=is_extrapolating,
            extrapolation_warnings=warnings
        )

    @classmethod
    def compute_sensitivity(cls, model_id: str, sweep_feature: str, steps_count: int = 25) -> SensitivityResponse:
        model_data = _get_model_data(model_id)
        pipeline = model_data["pipeline"]
        feature_cols = model_data["feature_columns"]
        baseline_inputs = model_data["baseline_inputs"]
        baseline_pred = model_data["baseline_pred"]
        ranges = model_data["feature_ranges"]

        if sweep_feature not in feature_cols:
            raise ModelFittingError(f"Feature '{sweep_feature}' was not used in model training.")

        meta = ranges.get(sweep_feature, {})
        steps_data = []

        if meta.get("type") == "numerical":
            vmin, vmax = meta["min"], meta["max"]
            sweep_vals = np.linspace(vmin, vmax, steps_count)
            for val in sweep_vals:
                inputs = baseline_inputs.copy()
                inputs[sweep_feature] = float(val)
                p = float(pipeline.predict(pd.DataFrame([inputs]))[0])
                steps_data.append({
                    "value": round(float(val), 2),
                    "prediction": round(p, 4),
                    "delta_from_baseline": round(p - baseline_pred, 4)
                })
        else:
            cats = meta.get("categories", [])
            for cat in cats:
                inputs = baseline_inputs.copy()
                inputs[sweep_feature] = str(cat)
                p = float(pipeline.predict(pd.DataFrame([inputs]))[0])
                steps_data.append({
                    "value": str(cat),
                    "prediction": round(p, 4),
                    "delta_from_baseline": round(p - baseline_pred, 4)
                })

        return SensitivityResponse(
            model_id=model_id,
            sweep_feature=sweep_feature,
            steps=steps_data
        )
