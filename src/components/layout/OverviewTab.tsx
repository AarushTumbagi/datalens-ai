import React from "react";
import { DatasetProfile, ColumnProfile } from "../../types/api";
import { MetricCard } from "../common/MetricCard";
import { Sparkline } from "../common/Sparkline";
import { Badge } from "../common/Badge";
import { Layers, Database, AlertCircle, Hash, HelpCircle, ArrowRight, Sparkles } from "lucide-react";
import { WorkspaceTab } from "./WorkspaceHeader";

interface OverviewTabProps {
  profile: DatasetProfile;
  onSelectColumn: (colName: string) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  profile,
  onSelectColumn,
  onNavigateTab,
}) => {
  const numColumns = profile.columns.filter((c) => c.inferred_type === "numerical");
  const catColumns = profile.columns.filter((c) => c.inferred_type === "categorical");

  return (
    <div className="space-y-6">
      {/* "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/20 border border-cyan-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-cyan-950/20">
        <div className="p-2 bg-cyan-900/40 border border-cyan-700/60 rounded-xl text-cyan-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>What is happening on the Overview page?</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded font-bold">Profiling Engine</span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            DataLens automatically scans every cell in your uploaded file to infer accurate data types (numerical, categorical, temporal), detect missing value sparsity, flag duplicate entries, and calculate 1.5× IQR outlier bounds.
            Each card below displays an empirical distribution sparkline so you can evaluate skewness and variance without having to plot individual charts manually.
          </p>
        </div>
      </div>

      {/* Top metrics summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Records"
          value={profile.row_count.toLocaleString()}
          subtext="Observational units"
          icon={<Database className="w-4 h-4 text-cyan-400" />}
          variant="cyan"
        />
        <MetricCard
          label="Dimensions"
          value={`${profile.column_count} Variables`}
          subtext={`${numColumns.length} numerical • ${catColumns.length} categorical`}
          icon={<Layers className="w-4 h-4 text-blue-400" />}
          variant="default"
        />
        <MetricCard
          label="Missing Cells"
          value={`${profile.total_missing_pct}%`}
          subtext={`${profile.total_missing_cells.toLocaleString()} empty values`}
          variant={profile.total_missing_pct > 10 ? "amber" : "emerald"}
          icon={<HelpCircle className="w-4 h-4" />}
        />
        <MetricCard
          label="Data Quality"
          value={profile.warnings.length === 0 ? "Optimal" : `${profile.warnings.length} Warnings`}
          subtext={profile.warnings.length === 0 ? "No anomalies detected" : "Check alerts panel"}
          variant={profile.warnings.length > 0 ? "amber" : "emerald"}
          icon={<AlertCircle className="w-4 h-4" />}
        />
      </div>

      {/* Warnings & Data Quality Alerts */}
      {profile.warnings.length > 0 && (
        <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-2xl space-y-2 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Dataset Integrity & Quality Alerts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {profile.warnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-200/90 flex items-start gap-2 bg-amber-950/60 p-2.5 rounded-xl border border-amber-800/40">
                <span className="text-amber-400 font-bold">•</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Profiling Cards (AutoViz Style) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Variables Profile & Empirical Distributions</span>
            </h3>
            <p className="text-xs text-slate-400">Click any variable card to inspect grounded AI explanations and statistics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab("relationships")}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-all bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-800/60"
            >
              <span>Explore Relationships</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.columns.map((col) => {
            const isNum = col.inferred_type === "numerical";
            return (
              <div
                key={col.name}
                onClick={() => onSelectColumn(col.name)}
                className="p-5 bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-slate-900 rounded-2xl transition-all cursor-pointer flex flex-col justify-between group shadow-lg backdrop-blur-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {col.name}
                    </span>
                    <Badge variant={isNum ? "cyan" : "slate"}>
                      {col.inferred_type}
                    </Badge>
                  </div>

                  {/* Sparkline distribution preview (AutoViz pattern) */}
                  <div className="my-3 py-2.5 px-3.5 bg-slate-950/70 rounded-xl flex items-center justify-between border border-slate-800/70">
                    <div className="text-[11px] text-slate-400 font-medium">Density:</div>
                    <Sparkline
                      bins={col.histogram_bins}
                      width={110}
                      height={28}
                      color={isNum ? "#00f2fe" : "#818cf8"}
                    />
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {isNum ? (
                      <>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Mean</span>
                          <span className="font-medium text-slate-200">{col.mean ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Median</span>
                          <span className="font-medium text-slate-200">{col.median ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Range</span>
                          <span className="font-medium text-slate-200">{col.min} – {col.max}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Outliers (IQR)</span>
                          <span className={`font-semibold ${(col.outliers_count ?? 0) > 0 ? "text-amber-400" : "text-slate-200"}`}>
                            {col.outliers_count ?? 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Unique Categories</span>
                          <span className="font-medium text-slate-200">{col.unique_count} distinct entries</span>
                        </div>
                        {col.top_categories && col.top_categories[0] && (
                          <div className="col-span-2 text-[11px] text-slate-400 truncate">
                            Top: <span className="text-cyan-300 font-medium">{col.top_categories[0].label}</span> ({col.top_categories[0].pct}%)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Missing indicator bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Missingness</span>
                  <span className={col.missing_pct > 10 ? "text-amber-400 font-medium" : "text-slate-400"}>
                    {col.missing_pct}% ({col.missing_count})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
