import React, { useState, useEffect } from "react";
import { DatasetProfile, ColumnProfile } from "../../types/api";
import { api } from "../../services/api";
import { BarChart2, TrendingUp, Sparkles, Filter, Info, Eye, Download, HelpCircle } from "lucide-react";
import { Badge } from "../common/Badge";

interface VisualizationStudioProps {
  profile: DatasetProfile;
  initialX?: string;
}

export const VisualizationStudio: React.FC<VisualizationStudioProps> = ({
  profile,
  initialX,
}) => {
  const numCols = profile.columns.filter((c) => c.inferred_type === "numerical").map((c) => c.name);
  const catCols = profile.columns.filter((c) => c.inferred_type === "categorical").map((c) => c.name);
  const allCols = profile.columns.map((c) => c.name);

  const [chartType, setChartType] = useState<"histogram" | "scatter" | "bar" | "line" | "box">("histogram");
  const [xCol, setXCol] = useState<string>(initialX || (numCols[0] || allCols[0]));
  const [yCol, setYCol] = useState<string>(numCols[1] || numCols[0] || "");
  const [colorCol, setColorCol] = useState<string>("");
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  useEffect(() => {
    if (initialX && allCols.includes(initialX)) {
      setXCol(initialX);
    }
  }, [initialX]);

  useEffect(() => {
    loadChart();
  }, [profile.dataset_id, chartType, xCol, yCol, colorCol]);

  const loadChart = async () => {
    if (!xCol) return;
    setIsLoading(true);
    setHoveredPoint(null);
    try {
      const data = await api.getChartData(
        profile.dataset_id,
        chartType,
        xCol,
        chartType !== "histogram" && chartType !== "box" ? yCol : undefined,
        colorCol || undefined
      );
      setChartData(data);
    } catch (err) {
      console.error("Failed to load chart data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isXNum = profile.columns.find((c) => c.name === xCol)?.inferred_type === "numerical";

  return (
    <div className="space-y-6">
      {/* Educational "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/20 border border-cyan-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-cyan-950/20">
        <div className="p-2 bg-cyan-900/40 border border-cyan-700/60 rounded-xl text-cyan-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>Visualization Studio Guide</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded font-bold">Interactive</span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            This workspace lets you visually inspect distribution profiles, identify bivariate correlations, and explore categorical groupings.
            Plots automatically reject incompatible variables and compute rigorous empirical bounds (IQR whiskers, bin frequencies, mean aggregations).
          </p>
        </div>
      </div>

      {/* Configuration Toolbar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md shadow-lg">
        {/* Chart type selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setChartType("histogram")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              chartType === "histogram" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Histogram
          </button>
          <button
            disabled={numCols.length < 2}
            onClick={() => setChartType("scatter")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-30 ${
              chartType === "scatter" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Scatter Plot
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              chartType === "bar" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Bar Chart
          </button>
          <button
            disabled={!numCols.includes(yCol)}
            onClick={() => setChartType("line")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-30 ${
              chartType === "line" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Line Chart
          </button>
          <button
            disabled={!isXNum}
            onClick={() => setChartType("box")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-30 ${
              chartType === "box" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40" : "text-slate-400 hover:text-white"
            }`}
          >
            Box Plot
          </button>
        </div>

        {/* Variables Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* X Axis */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">X-Axis:</span>
            <select
              value={xCol}
              onChange={(e) => setXCol(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {allCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Y Axis */}
          {chartType !== "histogram" && chartType !== "box" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Y-Axis:</span>
              <select
                value={yCol}
                onChange={(e) => setYCol(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                {allCols.filter((c) => c !== xCol).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Color grouping for scatter */}
          {chartType === "scatter" && catCols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Cluster Color:</span>
              <select
                value={colorCol}
                onChange={(e) => setColorCol(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="">None (Uniform)</option>
                {catCols.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas & Explanatory Box */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chart Viewport */}
        <div className="lg:col-span-3 p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl relative min-h-[480px] flex flex-col justify-between backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  {chartType.toUpperCase()}: <span className="text-cyan-400">{xCol}</span> {yCol && chartType !== "histogram" && chartType !== "box" ? `vs. ${yCol}` : ""}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {colorCol ? `Grouped by categories in ${colorCol}` : "High-precision empirical rendering"}
              </p>
            </div>

            {hoveredPoint && (
              <div className="text-xs px-3 py-1 bg-cyan-950/80 border border-cyan-800/80 rounded-lg text-cyan-300 font-mono shadow-md">
                {hoveredPoint.label}: <strong className="text-white">{hoveredPoint.val}</strong>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-cyan-400 text-xs">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Computing statistical visualization...</span>
              </div>
            </div>
          ) : chartData ? (
            <div className="flex-1 w-full flex items-center justify-center py-4 relative">
              {/* Histogram rendering */}
              {chartType === "histogram" && chartData.bins && (
                <svg viewBox="0 0 620 320" className="w-full h-80">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#4facfe" stopOpacity="0.65" />
                    </linearGradient>
                  </defs>
                  {/* Gridlines */}
                  {[60, 110, 160, 210, 260].map((y) => (
                    <line key={y} x1="50" y1={y} x2="590" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  <line x1="50" y1="260" x2="590" y2="260" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="260" stroke="#334155" strokeWidth="1.5" />
                  {(() => {
                    const maxCount = Math.max(...chartData.bins.map((b: any) => b.y), 1);
                    const binWidth = Math.max(8, (520 - (chartData.bins.length - 1) * 6) / chartData.bins.length);
                    return chartData.bins.map((b: any, i: number) => {
                      const h = Math.max(3, (b.y / maxCount) * 220);
                      const x = 55 + i * (binWidth + 6);
                      const y = 260 - h;
                      return (
                        <g
                          key={i}
                          className="group cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredPoint({ label: b.label || `Bin ${i+1}`, val: `${b.y} records` })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={binWidth}
                            height={h}
                            fill="url(#barGrad)"
                            rx={4}
                            className="hover:opacity-100 opacity-85 transition-opacity"
                          />
                          {b.y > 0 && (
                            <text x={x + binWidth / 2} y={y - 5} fill="#94A3B8" fontSize="9" textAnchor="middle" fontWeight="bold">
                              {b.y}
                            </text>
                          )}
                          <text x={x + binWidth / 2} y={278} fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                            {b.x}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}

              {/* Scatter rendering with strict NaN checks & glowing points */}
              {chartType === "scatter" && (
                <svg viewBox="0 0 620 320" className="w-full h-80">
                  <defs>
                    <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="1" />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* Gridlines */}
                  {[60, 110, 160, 210, 260].map((y) => (
                    <line key={y} x1="50" y1={y} x2="590" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  {[140, 230, 320, 410, 500].map((x) => (
                    <line key={x} x1={x} y1="20" x2={x} y2="260" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  <line x1="50" y1="260" x2="590" y2="260" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="260" stroke="#334155" strokeWidth="1.5" />

                  {(() => {
                    const rawPoints: any[] = chartData.points || [];
                    const validPoints = rawPoints.filter((p) => {
                      const vx = Number(p[xCol]);
                      const vy = Number(p[yCol]);
                      return !isNaN(vx) && isFinite(vx) && !isNaN(vy) && isFinite(vy);
                    });

                    if (validPoints.length === 0) {
                      return (
                        <text x="300" y="150" fill="#64748B" fontSize="12" textAnchor="middle">
                          No valid numerical coordinate pairs found for {xCol} & {yCol}
                        </text>
                      );
                    }

                    const xs = validPoints.map((p) => Number(p[xCol]));
                    const ys = validPoints.map((p) => Number(p[yCol]));
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    const colors = ["#00f2fe", "#4facfe", "#10b981", "#f59e0b", "#f43f5e", "#a855f7"];
                    const catMap: Record<string, string> = {};
                    let cIdx = 0;

                    return (
                      <>
                        {validPoints.map((p, i) => {
                          const vx = Number(p[xCol]);
                          const vy = Number(p[yCol]);
                          const xNorm = maxX !== minX ? (vx - minX) / (maxX - minX) : 0.5;
                          const yNorm = maxY !== minY ? (vy - minY) / (maxY - minY) : 0.5;

                          const cx = isFinite(xNorm) ? 60 + xNorm * 510 : 310;
                          const cy = isFinite(yNorm) ? 250 - yNorm * 220 : 140;

                          let fill = "#00f2fe";
                          if (colorCol && p[colorCol]) {
                            const val = String(p[colorCol]);
                            if (!catMap[val]) {
                              catMap[val] = colors[cIdx % colors.length];
                              cIdx++;
                            }
                            fill = catMap[val];
                          }

                          return (
                            <circle
                              key={i}
                              cx={cx}
                              cy={cy}
                              r={4.5}
                              fill={fill}
                              stroke="#090d16"
                              strokeWidth={1}
                              opacity={0.85}
                              className="hover:r-7 hover:opacity-100 cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredPoint({
                                label: `${xCol}=${vx}, ${yCol}=${vy}`,
                                val: colorCol && p[colorCol] ? `${colorCol}: ${p[colorCol]}` : "Point"
                              })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                          );
                        })}
                        {/* Axis Min/Max Ticks */}
                        <text x="60" y="278" fill="#64748B" fontSize="9" textAnchor="middle">{minX.toFixed(1)}</text>
                        <text x="570" y="278" fill="#64748B" fontSize="9" textAnchor="middle">{maxX.toFixed(1)}</text>
                        <text x="42" y="255" fill="#64748B" fontSize="9" textAnchor="end">{minY.toFixed(1)}</text>
                        <text x="42" y="35" fill="#64748B" fontSize="9" textAnchor="end">{maxY.toFixed(1)}</text>
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* Bar rendering with gradient styling */}
              {chartType === "bar" && chartData.data && (
                <svg viewBox="0 0 620 320" className="w-full h-80">
                  <defs>
                    <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#1e40af" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  {[60, 110, 160, 210, 260].map((y) => (
                    <line key={y} x1="50" y1={y} x2="590" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  <line x1="50" y1="260" x2="590" y2="260" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="260" stroke="#334155" strokeWidth="1.5" />
                  {(() => {
                    const validData = chartData.data.filter((d: any) => isFinite(Number(d.y)));
                    const maxVal = Math.max(...validData.map((d: any) => Number(d.y)), 1);
                    const barWidth = Math.min(48, Math.max(12, (520 - (validData.length - 1) * 8) / (validData.length || 1)));
                    return validData.map((d: any, i: number) => {
                      const h = Math.max(3, (Number(d.y) / maxVal) * 220);
                      const x = 60 + i * (barWidth + 8);
                      const y = 260 - h;
                      return (
                        <g
                          key={i}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint({ label: String(d.x), val: `${d.y}` })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={h}
                            fill="url(#barGradBlue)"
                            rx={4}
                            className="hover:opacity-100 opacity-85 transition-opacity"
                          />
                          <text x={x + barWidth / 2} y={y - 5} fill="#94A3B8" fontSize="9" textAnchor="middle" fontWeight="bold">
                            {d.y}
                          </text>
                          <text x={x + barWidth / 2} y={278} fill="#94A3B8" fontSize="8.5" textAnchor="middle">
                            {d.x.length > 8 ? d.x.substring(0, 7) + "…" : d.x}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}

              {/* Line rendering with gradient stroke and area glow */}
              {chartType === "line" && chartData.data && (
                <svg viewBox="0 0 620 320" className="w-full h-80">
                  <defs>
                    <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[60, 110, 160, 210, 260].map((y) => (
                    <line key={y} x1="50" y1={y} x2="590" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  <line x1="50" y1="260" x2="590" y2="260" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="20" x2="50" y2="260" stroke="#334155" strokeWidth="1.5" />
                  {(() => {
                    const validData = chartData.data.filter((d: any) => isFinite(Number(d.y)));
                    if (validData.length === 0) return null;
                    const ys = validData.map((d: any) => Number(d.y));
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    const pts = validData.map((d: any, i: number) => {
                      const x = 60 + (i / (validData.length - 1 || 1)) * 520;
                      const yNorm = maxY !== minY ? (Number(d.y) - minY) / (maxY - minY) : 0.5;
                      const y = 250 - yNorm * 220;
                      return `${x},${y}`;
                    }).join(" ");

                    const areaPts = `${pts} 580,260 60,260`;

                    return (
                      <>
                        <polygon fill="url(#lineAreaGrad)" points={areaPts} />
                        <polyline fill="none" stroke="#00f2fe" strokeWidth="3" points={pts} strokeLinecap="round" />
                        {validData.filter((_: any, i: number) => i % Math.ceil(validData.length / 8) === 0).map((d: any, i: number) => {
                          const x = 60 + (i * Math.ceil(validData.length / 8) / (validData.length - 1 || 1)) * 520;
                          return (
                            <text key={i} x={x} y={278} fill="#94A3B8" fontSize="9" textAnchor="middle">
                              {String(d.x).slice(-8)}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* Box plot rendering */}
              {chartType === "box" && chartData.stats && (
                <svg viewBox="0 0 440 260" className="w-full max-w-md h-64">
                  <line x1="60" y1="130" x2="380" y2="130" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
                  {/* Min and Max whiskers */}
                  <line x1="60" y1="95" x2="60" y2="165" stroke="#00f2fe" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="380" y1="95" x2="380" y2="165" stroke="#00f2fe" strokeWidth="3.5" strokeLinecap="round" />
                  {/* IQR box */}
                  <rect x="140" y="85" width="160" height="90" fill="#111827" stroke="#38bdf8" strokeWidth="2.5" rx={6} />
                  {/* Median line */}
                  <line x1="210" y1="85" x2="210" y2="175" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Labels */}
                  <text x="60" y="190" fill="#94A3B8" fontSize="10.5" textAnchor="middle" fontWeight="bold">Min: {chartData.stats.min}</text>
                  <text x="140" y="75" fill="#94A3B8" fontSize="10.5" textAnchor="middle">Q1: {chartData.stats.q25}</text>
                  <text x="210" y="195" fill="#10b981" fontSize="11" textAnchor="middle" fontWeight="bold">Median: {chartData.stats.median}</text>
                  <text x="300" y="75" fill="#94A3B8" fontSize="10.5" textAnchor="middle">Q3: {chartData.stats.q75}</text>
                  <text x="380" y="190" fill="#94A3B8" fontSize="10.5" textAnchor="middle" fontWeight="bold">Max: {chartData.stats.max}</text>
                </svg>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select variables to plot.
            </div>
          )}
        </div>

        {/* Statistical Explanation Card */}
        <div className="p-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-4 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Statistical Inference</span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              {chartType === "histogram" && (
                <p>
                  Visualizing the distribution of <span className="font-bold text-cyan-300">{xCol}</span>.
                  Histogram bars show continuous values grouped into equal intervals.
                  Check whether the distribution is unimodal, uniform, or skewed toward high extremes.
                </p>
              )}
              {chartType === "scatter" && (
                <p>
                  Scatter plot plotting <span className="font-bold text-cyan-300">{xCol}</span> against <span className="font-bold text-cyan-300">{yCol}</span>.
                  Reveals monotonicity, dispersion, and non-linear patterns. High alignment indicates correlation, but never proves causality without controlled intervention.
                </p>
              )}
              {chartType === "bar" && (
                <p>
                  Categorical aggregation of <span className="font-bold text-cyan-300">{xCol}</span>.
                  Compares group means or record occurrences across discrete factor levels.
                </p>
              )}
              {chartType === "line" && (
                <p>
                  Sequential trajectory tracking of <span className="font-bold text-cyan-300">{yCol}</span> over <span className="font-bold text-cyan-300">{xCol}</span>.
                  Highlights trend direction, seasonal oscillations, and anomalous transient dips.
                </p>
              )}
              {chartType === "box" && (
                <p>
                  Five-number Tukey summary for <span className="font-bold text-cyan-300">{xCol}</span>.
                  The inner box captures the 50% interquartile range (IQR); whiskers bound expected variance.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Active Configuration</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Horizontal (X):</span>
              <span className="font-mono text-cyan-400 font-bold">{xCol}</span>
            </div>
            {yCol && chartType !== "histogram" && chartType !== "box" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Vertical (Y):</span>
                <span className="font-mono text-blue-400 font-bold">{yCol}</span>
              </div>
            )}
            {colorCol && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cluster Color:</span>
                <span className="font-mono text-emerald-400 font-bold">{colorCol}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
