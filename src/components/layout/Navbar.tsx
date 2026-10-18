import React, { useRef } from "react";
import { Sparkles, Upload, Database, FileSpreadsheet, Activity, RefreshCw } from "lucide-react";
import { SampleDataset, DatasetProfile } from "../../types/api";

interface NavbarProps {
  currentProfile: DatasetProfile | null;
  samples: SampleDataset[];
  onLoadSample: (key: string) => void;
  onFileUpload: (file: File) => void;
  onReset: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProfile,
  samples,
  onLoadSample,
  onFileUpload,
  onReset,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950/60 p-2 border border-cyan-400/30">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-slate-100 tracking-tight">DataLens <span className="text-cyan-400">AI</span></span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-700/60 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Understand data • Discover connections • Explore what changes</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Sample dataset selector */}
        <div className="relative group">
          <button
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-lg hover:border-cyan-500/60 hover:text-white transition-all"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Datasets</span>
          </button>
          <div className="absolute right-0 mt-1 w-64 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Quick Load Samples</div>
            {samples.map((s) => (
              <button
                key={s.sample_id}
                onClick={() => onLoadSample(s.sample_id)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-all text-xs flex flex-col gap-0.5"
              >
                <div className="font-medium text-slate-200">{s.name}</div>
                <div className="text-[11px] text-slate-400">{s.rows} rows • {s.columns} cols</div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload file */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />
        <button
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>

        {currentProfile && (
          <button
            onClick={onReset}
            title="Reset dataset"
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
