import React, { useState, useEffect } from "react";
import { DatasetProfile, TrainModelResult, PredictResult, SensitivityResult } from "../../types/api";
import { api } from "../../services/api";
import { Sliders, Play, RotateCcw, AlertTriangle, TrendingUp, Cpu, CheckCircle2, Info, Sparkles, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";
import { MetricCard } from "../common/MetricCard";

interface WhatIfLabProps {
  profile: DatasetProfile;
}

export const WhatIfLab: React.FC<WhatIfLabProps> = ({ profile }) => {
  const numCols = profile.columns.filter((c) => c.inferred_type === "numerical").map((c) => c.name);
  const catCols = profile.columns.filter((c) => c.inferred_type === "categorical").map((c) => c.name);

  const [targetCol, setTargetCol] = useState<string>(numCols[numCols.length - 1] || numCols[0] || "");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [modelType, setModelType] = useState<string>("ridge");

  const [trainedModel, setTrainedModel] = useState<TrainModelResult | null>(null);
  const [scenarioInputs, setScenarioInputs] = useState<Record<string, any>>({});
  const [predictResult, setPredictResult] = useState<PredictResult | null>(null);
  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null);
  const [sweepFeature, setSweepFeature] = useState<string>("");

  const [isTraining, setIsTraining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const candidateFeatures = [...numCols, ...catCols].filter((c) => c !== targetCol);
    setSelectedFeatures(candidateFeatures.slice(0, 5));
    setTrainedModel(null);
    setPredictResult(null);
    setSensitivityResult(null);
  }, [targetCol]);

  const handleTrain = async () => {
    if (!targetCol || selectedFeatures.length === 0) return;
    setIsTraining(true);
    setErrorMsg(null);
    try {
      const res = await api.trainModel(profile.dataset_id, targetCol, selectedFeatures, modelType);
      setTrainedModel(res);
      setScenarioInputs(res.baseline_inputs);
      setSweepFeature(res.feature_columns[0] || "");
      if (res.feature_columns[0]) {
        const sens = await api.getSensitivity(profile.dataset_id, res.model_id, res.feature_columns[0]);
        setSensitivityResult(sens);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to train model.");
    } finally {
      setIsTraining(false);
    }
  };

  const handleInputChange = async (feat: string, val: any) => {
    const nextInputs = { ...scenarioInputs, [feat]: val };
    setScenarioInputs(nextInputs);

    if (trainedModel) {
      try {
        const res = await api.predictScenario(profile.dataset_id, trainedModel.model_id, nextInputs);
        setPredictResult(res);
      } catch (err) {
        console.error("Prediction failed:", err);
      }
    }
  };

  const handleSweepChange = async (feat: string) => {
    setSweepFeature(feat);
    if (trainedModel) {
      try {
        const sens = await api.getSensitivity(profile.dataset_id, trainedModel.model_id, feat);
        setSensitivityResult(sens);
      } catch (err) {
        console.error("Sensitivity compute failed:", err);
      }
    }
  };

  const resetToBaseline = () => {
    if (trainedModel) {
      setScenarioInputs(trainedModel.baseline_inputs);
      setPredictResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-slate-900/40 border border-purple-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-purple-950/20">
        <div className="p-2 bg-purple-900/40 border border-purple-700/60 rounded-xl text-purple-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>What is happening in the What-If Lab?</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-purple-900/60 text-purple-300 rounded font-bold">Predictive Simulator</span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            Here you train a validated statistical regression model (Ridge, ElasticNet, or Random Forest) to predict an outcome variable without data leakage.
            Once trained, the parameter sliders let you conduct <strong>counterfactual simulations</strong>: alter specific inputs to see how the model's prediction changes relative to baseline, with automatic warnings if you extrapolate beyond observed data.
          </p>
        </div>
      </div>

      {/* Target & Feature Configuration Card */}
      <div className="p-6 bg-slate-900/80 border border-slate-800/90 rounded-2xl space-y-4 backdrop-blur-md shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Predictive Model Specification</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fit an empirical estimator strictly on the 80% train split to simulate counterfactual changes.
            </p>
          </div>

          <button
            disabled={isTraining || selectedFeatures.length === 0}
            onClick={handleTrain}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-950 disabled:opacity-50 cursor-pointer"
          >
            {isTraining ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{trainedModel ? "Re-Fit Model" : "Fit Predictive Model"}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/50 border border-rose-900/70 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Target variable selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Outcome Variable (y)</label>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {numCols.map((c) => (
                <option key={c} value={c}>{c} (Continuous)</option>
              ))}
            </select>
          </div>

          {/* Model Family */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Estimator Algorithm</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="ridge">L2 Regularized Ridge (Robust Baseline)</option>
              <option value="elastic_net">ElasticNet (L1 + L2 Regularization)</option>
              <option value="random_forest">Random Forest Regressor (Non-linear)</option>
            </select>
          </div>

          {/* Features Checklist */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Predictive Features (X)</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
              {[...numCols, ...catCols].filter((c) => c !== targetCol).map((col) => {
                const isSelected = selectedFeatures.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => {
                      setSelectedFeatures(
                        isSelected ? selectedFeatures.filter((f) => f !== col) : [...selectedFeatures, col]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm"
                        : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance & What-If Simulation Laboratory */}
      {trainedModel && (
        <div className="space-y-6">
          {/* Model Evaluation Metrics (LinkedIn ML style) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Goodness of Fit (R²)"
              value={trainedModel.metrics.r2_score.toFixed(3)}
              subtext={`5-Fold CV: ${trainedModel.metrics.cv_r2_mean.toFixed(2)} ± ${trainedModel.metrics.cv_r2_std.toFixed(2)}`}
              variant={trainedModel.metrics.r2_score >= 0.5 ? "emerald" : "amber"}
            />
            <MetricCard
              label="Root Mean Squared Error"
              value={trainedModel.metrics.rmse.toLocaleString()}
              subtext="Validation split error"
              variant="default"
            />
            <MetricCard
              label="Mean Absolute Error"
              value={trainedModel.metrics.mae.toLocaleString()}
              subtext="Average absolute residual"
              variant="default"
            />
            <MetricCard
              label="Dataset Split"
              value={`${trainedModel.metrics.train_size} / ${trainedModel.metrics.test_size}`}
              subtext="Train vs Test (80/20 holdout)"
              variant="cyan"
            />
          </div>

          {/* Interactive Scenario Controls & Prediction Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sliders Input Panel */}
            <div className="lg:col-span-2 p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-5 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Counterfactual Parameter Sliders
                  </span>
                </div>
                <button
                  onClick={resetToBaseline}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Baseline</span>
                </button>
              </div>

              <div className="space-y-4">
                {trainedModel.feature_columns.map((feat) => {
                  const colProf = profile.columns.find((c) => c.name === feat);
                  const isNum = colProf?.inferred_type === "numerical";
                  const currentVal = scenarioInputs[feat] ?? trainedModel.baseline_inputs[feat];
                  const baseVal = trainedModel.baseline_inputs[feat];

                  if (isNum) {
                    const minVal = colProf?.min ?? 0;
                    const maxVal = colProf?.max ?? 100;
                    const stepVal = (maxVal - minVal) / 100 || 1;
                    return (
                      <div key={feat} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{feat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[11px]">Baseline: {baseVal}</span>
                            <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                              {currentVal}
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={minVal}
                          max={maxVal}
                          step={stepVal}
                          value={currentVal}
                          onChange={(e) => handleInputChange(feat, parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>
                    );
                  } else {
                    const categories = colProf?.top_categories?.map((c) => c.label) || [];
                    return (
                      <div key={feat} className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{feat}</span>
                          <span className="text-slate-500 text-[11px]">Baseline: {baseVal}</span>
                        </div>
                        <select
                          value={currentVal}
                          onChange={(e) => handleInputChange(feat, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Predictions & Delta Display Card */}
            <div className="space-y-4">
              <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Target: <span className="text-white">{trainedModel.target_column}</span>
                </div>

                {/* Scenario Prediction */}
                <div className="p-5 bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-800/50 rounded-2xl text-center space-y-1 shadow-inner">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Scenario Predicted Outcome</div>
                  <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">
                    {(predictResult?.prediction ?? trainedModel.baseline_prediction).toLocaleString()}
                  </div>
                </div>

                {/* Baseline Comparison */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Baseline Prediction:</span>
                    <span className="font-mono text-slate-200 font-semibold">{trainedModel.baseline_prediction.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Absolute Difference (Δ):</span>
                    <span className={`font-mono font-bold ${(predictResult?.delta_absolute ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {(predictResult?.delta_absolute ?? 0) >= 0 ? "+" : ""}
                      {(predictResult?.delta_absolute ?? 0).toLocaleString()}
                    </span>
                  </div>
                  {predictResult?.delta_relative_pct !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Relative Shift:</span>
                      <span className={`font-mono font-bold ${predictResult.delta_relative_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {predictResult.delta_relative_pct >= 0 ? "+" : ""}{predictResult.delta_relative_pct}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Extrapolation Warnings */}
                {predictResult?.is_extrapolating && (
                  <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Extrapolation Alert</span>
                    </div>
                    {predictResult.extrapolation_warnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-amber-200/90 leading-tight">• {w}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature Importances Card */}
              <div className="p-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-3 backdrop-blur-md shadow-xl">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Feature Importances</span>
                  <span className="text-[10px] text-slate-500 font-normal">Weights</span>
                </div>
                <div className="space-y-2.5">
                  {trainedModel.feature_importances.map((fi) => (
                    <div key={fi.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{fi.feature}</span>
                        <span className="font-mono text-cyan-400 font-bold">{(fi.importance * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, fi.importance * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Single-Variable Sensitivity Analysis Curve */}
          {sensitivityResult && (
            <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>Single-Variable Sensitivity Curve (Partial Dependence)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sweeps across the domain of <span className="font-semibold text-cyan-300">{sweepFeature}</span> while holding all other features fixed at baseline.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Sweep Variable:</span>
                  <select
                    value={sweepFeature}
                    onChange={(e) => handleSweepChange(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {trainedModel.feature_columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sensitivity Line Plot with gradient area fill */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <svg viewBox="0 0 600 200" className="w-full h-52">
                  <defs>
                    <linearGradient id="sensAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {[50, 90, 130, 170].map((y) => (
                    <line key={y} x1="50" y1={y} x2="570" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  <line x1="50" y1="170" x2="570" y2="170" stroke="#334155" strokeWidth="1" />
                  <line x1="50" y1="20" x2="50" y2="170" stroke="#334155" strokeWidth="1" />
                  {(() => {
                    const preds = sensitivityResult.steps.map((s) => s.prediction);
                    const minP = Math.min(...preds);
                    const maxP = Math.max(...preds);
                    const n = sensitivityResult.steps.length;

                    const pts = sensitivityResult.steps.map((s, idx) => {
                      const x = 50 + (idx / (n - 1 || 1)) * 520;
                      const yNorm = maxP !== minP ? (s.prediction - minP) / (maxP - minP) : 0.5;
                      const y = 160 - yNorm * 130;
                      return `${x},${y}`;
                    }).join(" ");

                    const areaPts = `${pts} 570,170 50,170`;

                    return (
                      <>
                        <polygon fill="url(#sensAreaGrad)" points={areaPts} />
                        <polyline fill="none" stroke="#00f2fe" strokeWidth="2.5" points={pts} strokeLinecap="round" />
                        {sensitivityResult.steps.map((s, idx) => {
                          if (idx % Math.ceil(n / 6) !== 0 && idx !== n - 1) return null;
                          const x = 50 + (idx / (n - 1 || 1)) * 520;
                          const yNorm = maxP !== minP ? (s.prediction - minP) / (maxP - minP) : 0.5;
                          const y = 160 - yNorm * 130;
                          return (
                            <g key={idx}>
                              <circle cx={x} cy={y} r={3.5} fill="#FFFFFF" stroke="#00f2fe" strokeWidth="1.5" />
                              <text x={x} y={185} fill="#94A3B8" fontSize="9" textAnchor="middle">
                                {String(s.value)}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
