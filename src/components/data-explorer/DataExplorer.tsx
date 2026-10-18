import React, { useState, useEffect } from "react";
import { DatasetProfile, DatasetPreview } from "../../types/api";
import { api } from "../../services/api";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, Sparkles, CheckSquare, Square, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";

interface DataExplorerProps {
  profile: DatasetProfile;
  onSelectColumn: (colName: string) => void;
  onSelectRows: (indices: number[]) => void;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({
  profile,
  onSelectColumn,
  onSelectRows,
}) => {
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [profile.dataset_id, page, sortBy, sortDesc, search]);

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPreview(
        profile.dataset_id,
        page,
        pageSize,
        search.trim() || undefined,
        sortBy,
        sortDesc
      );
      setPreview(data);
    } catch (err) {
      console.error("Failed to load dataset preview:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(col);
      setSortDesc(false);
    }
  };

  const toggleRowSelect = (index: number) => {
    const next = selectedRowIndices.includes(index)
      ? selectedRowIndices.filter((i) => i !== index)
      : [...selectedRowIndices, index];
    setSelectedRowIndices(next);
    onSelectRows(next);
  };

  const selectAllVisible = () => {
    if (!preview) return;
    if (selectedRowIndices.length === preview.rows.length) {
      setSelectedRowIndices([]);
      onSelectRows([]);
    } else {
      const all = preview.rows.map((_, i) => (page - 1) * pageSize + i);
      setSelectedRowIndices(all);
      onSelectRows(all);
    }
  };

  const totalPages = preview ? Math.ceil(preview.total_rows / pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900/40 border border-emerald-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-emerald-950/20">
        <div className="p-2 bg-emerald-900/40 border border-emerald-700/60 rounded-xl text-emerald-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>What is happening in the Data Explorer?</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded font-bold">Interactive Tabular Grid</span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            This view provides a fast, paginated window into the raw records. You can search strings, sort ascending/descending, and click column headers to immediately query the Context AI.
            <strong>Cohort Isolation</strong>: Check row boxes to isolate a specific subset of records—the Context Engine will automatically benchmark that cohort against the global dataset.
          </p>
        </div>
      </div>

      {/* Search and Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table values across all fields..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 shadow-inner"
            />
          </div>
          {selectedRowIndices.length > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-950/80 border border-cyan-800/80 rounded-xl text-xs text-cyan-300 shadow-md">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <span>{selectedRowIndices.length} rows selected for cohort AI analysis</span>
              <button
                onClick={() => {
                  setSelectedRowIndices([]);
                  onSelectRows([]);
                }}
                className="text-[11px] underline hover:text-white ml-2 font-semibold"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, preview?.total_rows ?? 0)} of{" "}
            {preview?.total_rows.toLocaleString() ?? "—"}
          </span>
          <button
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(page - 1)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-all text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-200 px-1">{page} / {totalPages || 1}</span>
          <button
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(page + 1)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-all text-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-800/90 rounded-2xl overflow-x-auto bg-slate-950/70 backdrop-blur-md shadow-2xl">
        <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
          <thead className="bg-slate-900/95 text-[11px] text-slate-400 font-semibold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="py-3 px-3 w-10 text-center">
                <button
                  onClick={selectAllVisible}
                  className="text-slate-400 hover:text-cyan-400"
                  title="Select all on page"
                >
                  {selectedRowIndices.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              {profile.columns.map((col) => {
                const isSorted = sortBy === col.name;
                return (
                  <th key={col.name} className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectColumn(col.name)}
                        className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors font-bold text-slate-200"
                        title="Click to view contextual AI explanation"
                      >
                        <span>{col.name}</span>
                        <Sparkles className="w-3 h-3 text-cyan-400/80" />
                      </button>
                      <button
                        onClick={() => handleSort(col.name)}
                        className={`p-1 rounded-md hover:bg-slate-800 transition-all ${
                          isSorted ? "text-cyan-400 font-bold" : "text-slate-500"
                        }`}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-normal lowercase text-[10px] text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                      <span>{col.inferred_type}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {isLoading ? (
              <tr>
                <td colSpan={profile.columns.length + 1} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading dataset slice...</span>
                  </div>
                </td>
              </tr>
            ) : preview && preview.rows.length > 0 ? (
              preview.rows.map((row, idx) => {
                const globalIdx = (page - 1) * pageSize + idx;
                const isSelected = selectedRowIndices.includes(globalIdx);
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isSelected ? "bg-cyan-950/40" : idx % 2 === 0 ? "bg-slate-950/30" : "bg-slate-900/20"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleRowSelect(globalIdx)}
                        className="text-slate-500 hover:text-cyan-400"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    {profile.columns.map((col) => {
                      const val = row[col.name];
                      const isEmpty = val === "" || val === null || val === undefined;
                      return (
                        <td key={col.name} className="py-2.5 px-4 whitespace-nowrap">
                          {isEmpty ? (
                            <span className="text-slate-600 italic">null</span>
                          ) : (
                            <span className="text-slate-200">{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={profile.columns.length + 1} className="py-12 text-center text-slate-400">
                  No records match your search filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
