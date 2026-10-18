import React, { useState, useEffect } from "react";
import { DatasetProfile, SampleDataset } from "./types/api";
import { api } from "./services/api";
import { Navbar } from "./components/layout/Navbar";
import { WorkspaceHeader, WorkspaceTab } from "./components/layout/WorkspaceHeader";
import { OverviewTab } from "./components/layout/OverviewTab";
import { DataExplorer } from "./components/data-explorer/DataExplorer";
import { VisualizationStudio } from "./components/visualizations/VisualizationStudio";
import { RelationshipGraph } from "./components/relationships/RelationshipGraph";
import { WhatIfLab } from "./components/what-if/WhatIfLab";
import { InsightsView } from "./components/insights/InsightsView";
import { ContextDrawer } from "./components/context-drawer/ContextDrawer";
import { Upload, Database, Sparkles, Share2, Sliders, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import { WorkflowGraphWidget } from "./components/common/WorkflowGraphWidget";

export default function App() {
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [selectedColumn, setSelectedColumn] = useState<string | undefined>(undefined);
  const [selectedRowsCount, setSelectedRowsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    try {
      const data = await api.listSamples();
      setSamples(data);
    } catch (err) {
      console.error("Failed to load sample datasets:", err);
    }
  };

  const handleLoadSample = async (sampleKey: string) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const res = await api.loadSample(sampleKey);
      setProfile(res.profile);
      setActiveTab("overview");
      setSelectedColumn(undefined);
    } catch (err: any) {
      setUploadError(err.message || "Failed to load sample.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const res = await api.uploadFile(file);
      setProfile(res.profile);
      setActiveTab("overview");
      setSelectedColumn(undefined);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setProfile(null);
    setActiveTab("overview");
    setSelectedColumn(undefined);
    setSelectedRowsCount(0);
  };

  const handleSelectColumn = (colName: string) => {
    setSelectedColumn(colName);
    setIsDrawerOpen(true);
  };

  const handleSelectRows = (indices: number[]) => {
    setSelectedRowsCount(indices.length);
    if (indices.length > 0) {
      setSelectedColumn(undefined);
      setIsDrawerOpen(true);
    }
  };

  const handleNavigateFromInsights = (tab: WorkspaceTab, contextKey?: string) => {
    setActiveTab(tab);
    if (contextKey && profile?.columns.some((c) => c.name === contextKey)) {
      setSelectedColumn(contextKey);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative">
      <div className="ambient-aurora" />
      <Navbar
        currentProfile={profile}
        samples={samples}
        onLoadSample={handleLoadSample}
        onFileUpload={handleFileUpload}
        onReset={handleReset}
        isLoading={isLoading}
      />

      {profile ? (
        <div className="flex-1 flex flex-col">
          <WorkspaceHeader
            profile={profile}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          />

          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
              {activeTab === "overview" && (
                <OverviewTab
                  profile={profile}
                  onSelectColumn={handleSelectColumn}
                  onNavigateTab={setActiveTab}
                />
              )}
              {activeTab === "explorer" && (
                <DataExplorer
                  profile={profile}
                  onSelectColumn={handleSelectColumn}
                  onSelectRows={handleSelectRows}
                />
              )}
              {activeTab === "visualizations" && (
                <VisualizationStudio
                  profile={profile}
                  initialX={selectedColumn}
                />
              )}
              {activeTab === "relationships" && (
                <RelationshipGraph
                  profile={profile}
                  onSelectVariable={handleSelectColumn}
                />
              )}
              {activeTab === "what-if" && (
                <WhatIfLab profile={profile} />
              )}
              {activeTab === "insights" && (
                <InsightsView
                  profile={profile}
                  onNavigateTab={handleNavigateFromInsights}
                />
              )}
            </main>

            {/* Context Intelligence Drawer (Ardra pattern) */}
            <ContextDrawer
              profile={profile}
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              selectedColumn={selectedColumn}
              selectedRowsCount={selectedRowsCount}
            />
          </div>
        </div>
      ) : (
        /* Professional Landing Page */
        <main className="flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-5 max-w-3xl mx-auto pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-800/80 rounded-full text-xs font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Stack AI Data Exploration Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
              Understand your data. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Discover connections. Explore what changes.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Transform raw CSV and Excel files into mathematically grounded analytical models, interactive variable relationship graphs, and counterfactual simulation laboratories.
            </p>

            {/* Interactive Analytical Pipeline & Graph Architecture Widget */}
            <div className="mt-8 text-left max-w-4xl mx-auto">
              <WorkflowGraphWidget />
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">
                {uploadError}
              </div>
            )}
          </div>

          {/* Quick Start: Sample Datasets or Drag & Drop Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* Quick Samples Card */}
            <div className="p-6 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl space-y-4 transition-all">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>One-Click Sample Datasets</span>
              </div>
              <p className="text-xs text-slate-400">
                Explore pre-loaded datasets to immediately evaluate relationship networks and what-if predictive simulations.
              </p>

              <div className="space-y-2.5 pt-2">
                {samples.map((s) => (
                  <button
                    key={s.sample_id}
                    disabled={isLoading}
                    onClick={() => handleLoadSample(s.sample_id)}
                    className="w-full text-left p-3.5 bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/80 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {s.rows} records • {s.columns} dimensions • {s.description}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Zone Card */}
            <div className="p-6 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl flex flex-col justify-between space-y-4 transition-all">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Upload className="w-4 h-4" />
                  <span>Upload Your Own Dataset</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Supports CSV, XLSX, and XLS formats up to 50MB. Complete in-memory analysis without persistent tracking.
                </p>
              </div>

              <label className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-950/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                <div className="w-12 h-12 rounded-xl bg-slate-900 group-hover:bg-cyan-950 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                    Click to browse or drop file here
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    .csv, .xlsx, .xls (auto-type inference)
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 3 Signature Features Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Context-Aware Explanation Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect datasets, isolated cohorts, and graph edges with grounded statistical calculations. Ask questions and receive evidence-backed findings.
              </p>
            </div>

            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Interactive Relationship Graph</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Force-directed network representing Pearson, Spearman, Cramér’s V, and Correlation Ratios with real-time strength threshold sliders.
              </p>
            </div>

            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">What-If Analysis Lab</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fit regression estimators with leakage-free preprocessing. Modify parameters on real-time sliders to observe predicted outcome changes.
              </p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
