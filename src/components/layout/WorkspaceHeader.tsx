import React from "react";
import {
  LayoutDashboard,
  Table,
  BarChart2,
  Share2,
  Sliders,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { DatasetProfile } from "../../types/api";

export type WorkspaceTab = "overview" | "explorer" | "visualizations" | "relationships" | "what-if" | "insights";

interface WorkspaceHeaderProps {
  profile: DatasetProfile;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  profile,
  activeTab,
  onTabChange,
  isDrawerOpen,
  onToggleDrawer,
}) => {
  const tabs = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "explorer", label: "Data Explorer", icon: <Table className="w-4 h-4" /> },
    { id: "visualizations", label: "Visualizations", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "relationships", label: "Relationship Graph", icon: <Share2 className="w-4 h-4" /> },
    { id: "what-if", label: "What-If Lab", icon: <Sliders className="w-4 h-4" /> },
    { id: "insights", label: "Insights", icon: <Sparkles className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="border-b border-slate-800 bg-slate-950/40 px-6 pt-4 pb-0 flex flex-col gap-3">
      {/* Dataset Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{profile.filename}</h2>
              {profile.warnings.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {profile.warnings.length} alerts
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
              <span>{profile.row_count.toLocaleString()} rows</span>
              <span>•</span>
              <span>{profile.column_count} columns</span>
              <span>•</span>
              <span>{profile.total_missing_pct}% missing cells</span>
              {profile.duplicate_rows_count > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">{profile.duplicate_rows_count} duplicates</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* AI Explanation Drawer Toggle (Ardra style) */}
        <button
          onClick={onToggleDrawer}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isDrawerOpen
              ? "bg-cyan-950 text-cyan-300 border-cyan-700 shadow-md shadow-cyan-950"
              : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Context & AI Explanations</span>
        </button>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-800/60 pt-2 -mx-6 px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as WorkspaceTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
