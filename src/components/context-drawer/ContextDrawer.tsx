import React, { useState, useEffect } from "react";
import { DatasetProfile, ContextExplainResult, QuestionResult } from "../../types/api";
import { api } from "../../services/api";
import { Sparkles, Send, X, FileSpreadsheet, HelpCircle, Table, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "../common/Badge";

interface ContextDrawerProps {
  profile: DatasetProfile;
  isOpen: boolean;
  onClose: () => void;
  selectedColumn?: string;
  selectedRowsCount?: number;
}

export const ContextDrawer: React.FC<ContextDrawerProps> = ({
  profile,
  isOpen,
  onClose,
  selectedColumn,
  selectedRowsCount,
}) => {
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [contextExplanation, setContextExplanation] = useState<ContextExplainResult | null>(null);
  const [qaHistory, setQaHistory] = useState<QuestionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    loadSuggestedQuestions();
  }, [profile.dataset_id]);

  useEffect(() => {
    loadContextExplanation();
  }, [profile.dataset_id, selectedColumn, selectedRowsCount]);

  const loadSuggestedQuestions = async () => {
    try {
      const questions = await api.getSuggestedQuestions(profile.dataset_id);
      setSuggestedQuestions(questions);
    } catch (err) {
      console.error(err);
    }
  };

  const loadContextExplanation = async () => {
    setIsLoading(true);
    try {
      const type = selectedColumn ? "column" : selectedRowsCount ? "selection" : "dataset";
      const res = await api.explainContext(
        profile.dataset_id,
        type,
        selectedColumn,
        undefined,
        selectedRowsCount ? [0, 1, 2] : undefined
      );
      setContextExplanation(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async (qText?: string) => {
    const q = (qText || questionInput).trim();
    if (!q) return;
    setIsAsking(true);
    setQuestionInput("");
    try {
      const res = await api.askQuestion(profile.dataset_id, q, selectedColumn);
      setQaHistory((prev) => [res, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col h-[calc(100vh-4rem)] sticky top-16 z-30 shadow-2xl">
      {/* Header (Ardra style) */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">
            Context & Intelligence
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
        {/* Associated Dataset Box (Ardra style) */}
        <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Associated Dataset
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded text-[10px] font-bold">
              {profile.filename.endsWith(".csv") ? "CSV" : "EXCEL"}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200 truncate">
              {profile.filename}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {profile.row_count.toLocaleString()} rows • {profile.column_count} columns
          </div>
        </div>

        {/* Grounded Context Explanation */}
        {isLoading ? (
          <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing active focus...</span>
          </div>
        ) : contextExplanation ? (
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs">{contextExplanation.headline}</span>
              <Badge variant="cyan" size="sm">Grounded</Badge>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">{contextExplanation.explanation}</p>

            {/* Evidence Badges */}
            {contextExplanation.evidence.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="text-[10px] font-bold uppercase text-slate-500">Supporting Calculations</div>
                {contextExplanation.evidence.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-slate-950/60 p-1.5 rounded border border-slate-800/40">
                    <span className="text-slate-400">{ev.metric}:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{ev.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Important Questions List (Ardra style) */}
        {suggestedQuestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Important Questions
            </div>
            <div className="space-y-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(q)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-slate-900 text-[11px] text-slate-300 transition-all flex items-start gap-2 group"
                >
                  <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                  <span className="group-hover:text-cyan-200 transition-colors">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Conversation History */}
        {qaHistory.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Analytical Inquiry Log
            </div>
            {qaHistory.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-slate-200 text-[11px]">
                  Q: {item.question}
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {item.answer}
                </div>

                {/* Evidence table if returned */}
                {item.evidence_table && item.evidence_table.length > 0 && (
                  <div className="overflow-x-auto mt-2 border border-slate-800 rounded bg-slate-950">
                    <table className="w-full text-[10px] text-left divide-y divide-slate-800">
                      <thead className="bg-slate-900 text-slate-400">
                        <tr>
                          {Object.keys(item.evidence_table[0]).map((k) => (
                            <th key={k} className="p-1.5 font-semibold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                        {item.evidence_table.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {Object.values(row).map((val: any, cIdx) => (
                              <td key={cIdx} className="p-1.5 whitespace-nowrap">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input box */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything about this dataset..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isAsking || !questionInput.trim()}
            className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-white hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 transition-all"
          >
            {isAsking ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </aside>
  );
};
