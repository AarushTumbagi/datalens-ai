import pytest
import io
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.services.file_loader import FileLoaderService
from app.services.profiling_service import ProfilingService
from app.services.statistics_service import StatisticsService
from app.services.modeling_service import ModelingService

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_samples_list():
    response = client.get("/api/datasets/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 2
    sample_ids = [s["sample_id"] for s in samples]
    assert "sensor" in sample_ids
    assert "housing" in sample_ids

def test_sample_load_and_profile():
    response = client.post("/api/datasets/sample/sensor")
    assert response.status_code == 200
    data = response.json()
    assert "dataset_id" in data
    assert data["profile"]["row_count"] == 250
    assert data["profile"]["column_count"] == 7
    
    # Check that temperature_c has numerical statistics
    temp_col = next(c for c in data["profile"]["columns"] if c["name"] == "temperature_c")
    assert temp_col["inferred_type"] == "numerical"
    assert temp_col["mean"] is not None
    assert temp_col["median"] is not None
    assert len(temp_col["histogram_bins"]) > 0

def test_csv_upload():
    # Synthetic CSV
    csv_content = "id,score,category,target\n1,10.5,A,100\n2,20.0,B,200\n3,15.2,A,150\n4,35.1,B,350\n5,25.0,A,250\n"
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 200
    res = response.json()
    assert res["profile"]["row_count"] == 5
    assert res["profile"]["column_count"] == 4

def test_relationship_graph():
    # Load housing sample
    load_res = client.post("/api/datasets/sample/housing").json()
    dataset_id = load_res["dataset_id"]
    
    response = client.get(f"/api/datasets/{dataset_id}/graph?threshold=0.15")
    assert response.status_code == 200
    graph = response.json()
    assert len(graph["nodes"]) == 6
    assert len(graph["edges"]) > 0
    
    # Verify square_footage and price_usd have positive correlation
    edge = next((e for e in graph["edges"] if ("square_footage" in e["source"] and "price_usd" in e["target"]) or ("price_usd" in e["source"] and "square_footage" in e["target"])), None)
    assert edge is not None
    assert edge["metric"] == "pearson"
    assert edge["value"] > 0.5  # Strong positive correlation

def test_what_if_training_and_prediction():
    load_res = client.post("/api/datasets/sample/housing").json()
    dataset_id = load_res["dataset_id"]
    
    # Train model
    train_payload = {
        "target_column": "price_usd",
        "feature_columns": ["square_footage", "bedrooms", "bathrooms", "neighborhood", "distance_transit_miles"],
        "model_type": "ridge"
    }
    train_res = client.post(f"/api/datasets/{dataset_id}/train", json=train_payload)
    assert train_res.status_code == 200
    model_data = train_res.json()
    assert model_data["metrics"]["r2_score"] > 0.5
    assert "model_id" in model_data
    model_id = model_data["model_id"]
    baseline_pred = model_data["baseline_prediction"]

    # Predict modified scenario
    # Increase square footage
    baseline_inputs = model_data["baseline_inputs"].copy()
    baseline_inputs["square_footage"] = baseline_inputs["square_footage"] + 500
    
    pred_res = client.post(f"/api/datasets/{dataset_id}/predict", json={"model_id": model_id, "inputs": baseline_inputs})
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["prediction"] > baseline_pred
    assert pred_data["delta_absolute"] > 0

def test_sensitivity_sweep():
    load_res = client.post("/api/datasets/sample/housing").json()
    dataset_id = load_res["dataset_id"]
    
    train_payload = {
        "target_column": "price_usd",
        "feature_columns": ["square_footage", "bedrooms"],
        "model_type": "ridge"
    }
    train_res = client.post(f"/api/datasets/{dataset_id}/train", json=train_payload)
    model_id = train_res.json()["model_id"]

    sens_res = client.post(f"/api/datasets/{dataset_id}/sensitivity", json={"model_id": model_id, "sweep_feature": "square_footage", "steps": 10})
    assert sens_res.status_code == 200
    sens_data = sens_res.json()
    assert len(sens_data["steps"]) == 10
    # Values should increase monotonically
    preds = [s["prediction"] for s in sens_data["steps"]]
    assert preds[-1] > preds[0]

def test_context_explanation_and_questions():
    load_res = client.post("/api/datasets/sample/sensor").json()
    dataset_id = load_res["dataset_id"]

    # Explain column
    exp_res = client.post(f"/api/datasets/{dataset_id}/explain", json={"context_type": "column", "target_name": "temperature_c"})
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert "temperature_c" in exp_data["headline"]
    assert len(exp_data["evidence"]) >= 3

    # Natural Language QA
    q_res = client.post(f"/api/datasets/{dataset_id}/question", json={"question": "Which phase has the highest average current_amp?"})
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert "current_amp" in q_data["answer"]
    assert q_data["evidence_table"] is not None

def test_ranked_insights():
    load_res = client.post("/api/datasets/sample/housing").json()
    dataset_id = load_res["dataset_id"]

    res = client.get(f"/api/datasets/{dataset_id}/insights")
    assert res.status_code == 200
    insights = res.json()["insights"]
    assert len(insights) > 0
    categories = [i["category"] for i in insights]
    assert "correlation" in categories
