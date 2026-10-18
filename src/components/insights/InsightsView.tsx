import React, { useState, useEffect } from "react";
import { DatasetProfile, RankedInsights, InsightItem, WorkspaceTab } from "../../types/api";
import { api } from "../../services/api";
import { Sparkles, ArrowRight, Share2, AlertTriangle, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";

interface InsightsViewProps {
  profile: DatasetProfile;
  onNavigateTab: (tab: WorkspaceTab, contextKey?: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ profile, onNavigateTab }) => {
  const [rankedInsights, setRankedInsights] = useState<RankedInsights | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [profile.dataset_id]);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRankedInsights(profile.dataset_id);
      setRankedInsights(data);
    } catch (err) {
      console.error("Failed to load ranked insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = rankedInsights?.insights.filter((item) =>
    filterCategory === "all" ? true : item.category === filterCategory
  ) || [];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "correlation":
        return <Share2 className="w-4 h-4 text-cyan-400" />;
      case "anomaly":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "distribution":
        return <TrendingUp className="w-4 h-4 text-indigo-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900/40 border border-amber-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-amber-950/20">
        <div className="p-2 bg-amber-900/40 border border-amber-700/60 rounded-xl text-amber-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>What is happening on the Insights page?</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-amber-900/60 text-amber-300 rounded font-bold">Automated Discoveries</span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            DataLens autonomously sifts through the dataset to identify statistically significant findings.
            Findings are ranked by effect size into: <strong>Correlations</strong> (strong monotonic dependencies), <strong>Anomalies</strong> (IQR outlier clusters), <strong>Distributions</strong> (high skewness and multimodality), and <strong>Data Quality</strong> (missingness and duplicates).
            Click <strong>Inspect</strong> on any finding to jump directly to its analytical canvas.
          </p>
        </div>
      </div>

      {/* Header and Filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl backdrop-blur-md shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Ranked Automated Discoveries</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by calculated effect size and statistical significance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold shadow-inner">
          {["all", "correlation", "anomaly", "distribution", "data_quality"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-lg transition-all capitalize ${
                filterCategory === cat
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Cards List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Ranking statistical discoveries...</span>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/50 rounded-2xl space-y-3 flex flex-col justify-between transition-all backdrop-blur-md shadow-xl"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(item.category)}
                    <Badge variant={item.category === "anomaly" ? "amber" : "cyan"}>
                      {item.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Significance Score: <strong className="text-cyan-300 font-bold">{item.score}</strong>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>

                {/* Evidence citation box */}
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-400 font-bold">Evidence: </span>
                  {item.evidence}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => onNavigateTab(item.target_tab as WorkspaceTab, item.context_key)}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-colors bg-cyan-950/40 px-3 py-1 rounded-lg border border-cyan-800/50"
                >
                  <span>Inspect in {item.target_tab.replace("-", " ")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-xs">
          No insights found matching this filter category.
        </div>
      )}
    </div>
  );
};
