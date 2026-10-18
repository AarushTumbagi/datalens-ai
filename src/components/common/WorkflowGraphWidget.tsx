"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  lane: string;
  laneIndex: number;
  pillLabel: string;
  badge: string;
  color: string;
  formula: string;
  description: string;
  guarantees: string[];
}

const STEPS: WorkflowStep[] = [
  {
    id: "intake",
    name: "Intake",
    lane: "INTAKE",
    laneIndex: 0,
    pillLabel: "parse bytes",
    badge: "INGESTION",
    color: "#38bdf8",
    formula: "H(D) = -\\sum p_i \\log_2 p_i",
    description: "Raw CSV and Excel files are validated, streamed into memory, and parsed with automatic delimiter and UTF-8 / Latin-1 encoding detection.",
    guarantees: [
      "Zero execution of uploaded file contents",
      "Dynamic header normalization & duplicate deduplication",
      "Enforces configurable 50MB and row bounds"
    ]
  },
  {
    id: "profile",
    name: "Profile",
    lane: "SANITIZE",
    laneIndex: 1,
    pillLabel: "infer types",
    badge: "PROFILING",
    color: "#34d399",
    formula: "\\text{IQR} = Q_3 - Q_1, \\quad [Q_1 - 1.5\\text{IQR}, Q_3 + 1.5\\text{IQR}]",
    description: "Infers strict analytical types (numerical continuous, discrete categorical, ISO datetime, free text). Audits missingness and calculates 1.5× IQR outlier bounds.",
    guarantees: [
      "Distinguishes valid zero values from null sparsity",
      "Calculates parametric (mean, std) and non-parametric (median, IQR) moments",
      "Generates 15-bin empirical distribution histograms"
    ]
  },
  {
    id: "correlate",
    name: "Correlate",
    lane: "TOPOLOGY",
    laneIndex: 2,
    pillLabel: "compute r & V",
    badge: "ASSOCIATION",
    color: "#00f2fe",
    formula: "V = \\sqrt{\\frac{\\chi^2}{n \\cdot \\min(r-1, k-1)}}, \\quad \\eta^2 = \\frac{SS_{\\text{between}}}{SS_{\\text{total}}}",
    description: "Generates the variable relationship network. Discards arbitrary causal claims and applies the mathematically appropriate association measure for every pair.",
    guarantees: [
      "Continuous-Continuous: Pearson linear r & Spearman monotonic rank ρ",
      "Categorical-Categorical: Cramér's V with Bergsma-Wicher degrees of freedom correction",
      "Continuous-Categorical: Correlation Ratio (η) ANOVA variance decomposition"
    ]
  },
  {
    id: "model",
    name: "Model",
    lane: "PIPELINE",
    laneIndex: 3,
    pillLabel: "train split",
    badge: "ESTIMATION",
    color: "#a855f7",
    formula: "\\min_w \\|Xw - y\\|_2^2 + \\alpha \\|w\\|_2^2, \\quad R^2 = 1 - \\frac{\\sum(y - \\hat{y})^2}{\\sum(y - \\bar{y})^2}",
    description: "Fits a rigorous predictive regression estimator (Ridge, ElasticNet, or Random Forest) strictly preserving train/test boundaries to eliminate data leakage.",
    guarantees: [
      "Transformers fit exclusively on 80% train split",
      "Evaluates holdout generalization via R², RMSE, and MAE",
      "Computes 5-fold cross-validated stability intervals"
    ]
  },
  {
    id: "simulate",
    name: "What-If Lab",
    lane: "SIMULATION",
    laneIndex: 4,
    pillLabel: "perturb delta",
    badge: "COUNTERFACTUAL",
    color: "#fbbf24",
    formula: "\\Delta \\hat{y} = \\hat{f}(x_0 + \\Delta x) - \\hat{f}(x_0), \\quad \\Delta\\% = \\frac{\\Delta \\hat{y}}{\\hat{f}(x_0)} \\times 100",
    description: "Interactive laboratory simulating counterfactual outcomes. Users perturb parameters with sliders to observe model response relative to baseline.",
    guarantees: [
      "Displays absolute (Δy) and percentage (Δ%) shifts from baseline",
      "Single-variable partial dependence sensitivity curves",
      "Automatic alert flags if inputs extrapolate beyond observed training bounds"
    ]
  },
  {
    id: "explain",
    name: "Grounded AI",
    lane: "SYNTHESIS",
    laneIndex: 5,
    pillLabel: "cite evidence",
    badge: "EXPLANATION",
    color: "#f43f5e",
    formula: "\\text{Evidence}(E) = \\{(v_i, v_j, r, p) \\mid |r| \\ge \\tau\\}",
    description: "Translates calculations into plain-language explanations. Every sentence is grounded in computed numerical outputs—zero hallucination permitted.",
    guarantees: [
      "Deterministic rule-based statistical synthesis operates 100% offline",
      "Interactive natural language question registry answering group means and outliers",
      "Structured JSON evidence citations for every factual statement"
    ]
  }
];

export const WorkflowGraphWidget: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(2); // Start on Correlate (hub)
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % STEPS.length);
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  const activeStep = STEPS[activeIdx];

  // Generous, balanced column lane positions (Width = 940)
  const lanes = [
    { idx: 0, x: 95, label: "INTAKE" },
    { idx: 1, x: 260, label: "PROFILE" },
    { idx: 2, x: 450, label: "CORRELATE" }, // Multi-branch Hub
    { idx: 3, x: 640, label: "ESTIMATE" },
    { idx: 4, x: 790, label: "SIMULATE" },
    { idx: 5, x: 890, label: "SYNTHESIS" },
  ];

  // Grid vertical separator lines between lanes
  const separators = [177, 355, 545, 715, 840];

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-700/60 bg-[#0a0e17]/95 backdrop-blur-2xl shadow-2xl shadow-cyan-950/40 relative">
      {/* Top Header Stage Selector Pills (Faithful to Reference Image 2) */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveIdx(idx);
                  setIsPlaying(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-800/90 text-white border border-cyan-400 shadow-md shadow-cyan-950/50"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full transition-transform duration-300"
                  style={{
                    backgroundColor: isActive ? s.color : "#475569",
                    transform: isActive ? "scale(1.2)" : "scale(1)"
                  }}
                />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isPlaying ? "Pause" : "Auto Flow"}</span>
        </button>
      </div>

      {/* Main Interactive Graph Canvas with True Distancing & Multi-Lane Architecture */}
      <div className="relative p-6 pt-5 pb-3">
        <div className="w-full">
          <svg
            viewBox="0 0 940 370"
            className="w-full h-[320px] sm:h-[370px] overflow-visible select-none"
          >
            <defs>
              {/* Radial glow filter for active hub node */}
              <filter id="hubGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Subtle luminous node fills */}
              <radialGradient id="glowIntake" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowProfile" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowCorrelate" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.10" />
              </radialGradient>
              <radialGradient id="glowDecompose" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowNoise" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#9f1239" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowModel" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6b21a8" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowSimulate" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="glowSynthesis" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.06" />
              </radialGradient>
            </defs>

            {/* Vertical Lane Divider Guidelines (Matching Reference Image) */}
            {separators.map((sepX, sIdx) => (
              <line
                key={sIdx}
                x1={sepX}
                y1={20}
                x2={sepX}
                y2={340}
                stroke="#334155"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="none"
              />
            ))}

            {/* Lane Column Header / Footer Watermarks */}
            {lanes.map((lane) => (
              <text
                key={lane.idx}
                x={lane.x}
                y={352}
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
                letterSpacing="0.1em"
                opacity={activeStep.laneIndex === lane.idx ? 0.9 : 0.4}
              >
                {lane.label}
              </text>
            ))}

            {/* CONNECTORS (Smooth Bézier Splines with Generous Radius) */}
            
            {/* 1. Intake -> Profile */}
            <path
              d="M 95,190 L 260,190"
              fill="none"
              stroke={activeIdx >= 1 ? "#34d399" : "#334155"}
              strokeWidth={activeIdx >= 1 ? 2.5 : 1.5}
            />

            {/* 2. Profile -> Correlate (Active Primary Hub) */}
            <path
              d="M 260,190 C 330,190 370,110 450,110"
              fill="none"
              stroke={activeIdx >= 2 ? "#00f2fe" : "#334155"}
              strokeWidth={activeIdx >= 2 ? 2.5 : 1.5}
            />

            {/* 3. Correlate -> Decompose (Vertical Stack in Lane 2) */}
            <line
              x1="450"
              y1="110"
              x2="450"
              y2="215"
              stroke={activeIdx === 2 ? "#00f2fe" : "#334155"}
              strokeWidth="2"
            />
            {/* Arrowhead down into Decompose */}
            <polygon
              points="446,206 450,215 454,206"
              fill={activeIdx === 2 ? "#00f2fe" : "#475569"}
            />

            {/* 4. Decompose -> Pruned Noise (Dashed Red Branch down to Bottom Node) */}
            <line
              x1="450"
              y1="215"
              x2="450"
              y2="305"
              stroke="#f43f5e"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              opacity={activeIdx === 2 ? 0.85 : 0.4}
            />
            {/* Arrowhead down into Pruned */}
            <polygon
              points="446,296 450,305 454,296"
              fill="#f43f5e"
              opacity={activeIdx === 2 ? 0.85 : 0.4}
            />

            {/* 5. Correlate -> Model Pipeline (Forward Primary Path) */}
            <path
              d="M 450,110 L 640,110"
              fill="none"
              stroke={activeIdx >= 3 ? "#a855f7" : "#334155"}
              strokeWidth={activeIdx >= 3 ? 2.5 : 1.5}
            />

            {/* 6. Alternate Dashed Branch: Correlate -> What-If Sensitivity (Matching reference red/amber dashed curve) */}
            <path
              d="M 450,110 C 530,120 630,225 790,225"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.6"
              strokeDasharray="4 4"
              opacity={activeIdx >= 2 ? 0.7 : 0.25}
            />

            {/* 7. Model -> What-If Lab */}
            <path
              d="M 640,110 C 710,110 730,225 790,225"
              fill="none"
              stroke={activeIdx >= 4 ? "#fbbf24" : "#334155"}
              strokeWidth={activeIdx >= 4 ? 2.5 : 1.5}
            />

            {/* 8. What-If Lab -> Grounded AI */}
            <path
              d="M 790,225 C 835,225 850,150 890,150"
              fill="none"
              stroke={activeIdx >= 5 ? "#f43f5e" : "#334155"}
              strokeWidth={activeIdx >= 5 ? 2.5 : 1.5}
            />

            {/* TRANSITION PILLS (Centered along paths with ample breathing room) */}
            
            {/* Pill 1: parse schema */}
            <g transform="translate(177, 190)">
              <rect x="-38" y="-11" width="76" height="22" rx="11" fill="#060911" stroke={activeIdx >= 1 ? "#34d399" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx >= 1 ? "#34d399" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                parse bytes
              </text>
            </g>

            {/* Pill 2: bivariate r */}
            <g transform="translate(345, 142)">
              <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#060911" stroke={activeIdx >= 2 ? "#00f2fe" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx >= 2 ? "#00f2fe" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                bivariate r
              </text>
            </g>

            {/* Pill 3 (Vertical): Cramér's V */}
            <g transform="translate(450, 162)">
              <rect x="-38" y="-11" width="76" height="22" rx="11" fill="#060911" stroke={activeIdx === 2 ? "#00f2fe" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx === 2 ? "#00f2fe" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                Cramér's V
              </text>
            </g>

            {/* Pill 4 (Vertical Dashed): prune |r|<0.2 */}
            <g transform="translate(450, 260)">
              <rect x="-44" y="-11" width="88" height="22" rx="11" fill="#060911" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 2" />
              <text x="0" y="3.5" fill="#f43f5e" fontSize="9" textAnchor="middle" fontFamily="monospace">
                prune |r|&lt;0.2
              </text>
            </g>

            {/* Pill 5: train split */}
            <g transform="translate(545, 110)">
              <rect x="-38" y="-11" width="76" height="22" rx="11" fill="#060911" stroke={activeIdx >= 3 ? "#a855f7" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx >= 3 ? "#a855f7" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                train split
              </text>
            </g>

            {/* Pill 6 (Amber dashed curve): partial dependence */}
            <g transform="translate(635, 185)">
              <rect x="-48" y="-11" width="96" height="22" rx="11" fill="#060911" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 2" />
              <text x="0" y="3.5" fill="#fbbf24" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                sensitivity sweep
              </text>
            </g>

            {/* Pill 7: perturb delta */}
            <g transform="translate(720, 160)">
              <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#060911" stroke={activeIdx >= 4 ? "#fbbf24" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx >= 4 ? "#fbbf24" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                perturb delta
              </text>
            </g>

            {/* Pill 8: cite evidence */}
            <g transform="translate(845, 185)">
              <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#060911" stroke={activeIdx >= 5 ? "#f43f5e" : "#334155"} strokeWidth="1" />
              <text x="0" y="3.5" fill={activeIdx >= 5 ? "#f43f5e" : "#64748b"} fontSize="9" textAnchor="middle" fontFamily="monospace">
                cite evidence
              </text>
            </g>

            {/* NODES (Colourful yet subtle, high clarity with backing pills) */}

            {/* 1. Intake Node (Lane 0) */}
            <g
              onClick={() => { setActiveIdx(0); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="95" cy="190" r="25" fill="url(#glowIntake)" stroke="#38bdf8" strokeWidth={activeIdx === 0 ? 2.5 : 1.4} strokeOpacity={activeIdx === 0 ? 1 : 0.6} strokeDasharray={activeIdx === 0 ? "4 3" : "none"} />
              <circle cx="95" cy="190" r="16" fill="#08101e" stroke="#38bdf8" strokeWidth="2" strokeOpacity={activeIdx === 0 ? 1 : 0.8} />
              <polygon points="92,186 99,190 92,194" fill="#38bdf8" />
              {/* High-Clarity Label Pill */}
              <rect x="67" y="140" width="56" height="18" rx="6" fill="#060913" fillOpacity="0.9" stroke={activeIdx === 0 ? "#38bdf8" : "rgba(56, 189, 248, 0.4)"} strokeWidth="1" />
              <text x="95" y="153" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Intake</text>
            </g>

            {/* 2. Profile Node (Lane 1) */}
            <g
              onClick={() => { setActiveIdx(1); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="260" cy="190" r="27" fill="url(#glowProfile)" stroke="#34d399" strokeWidth={activeIdx === 1 ? 2.5 : 1.4} strokeOpacity={activeIdx === 1 ? 1 : 0.6} strokeDasharray={activeIdx === 1 ? "4 3" : "none"} />
              <circle cx="260" cy="190" r="17" fill="#081519" stroke="#34d399" strokeWidth="2" strokeOpacity={activeIdx === 1 ? 1 : 0.8} />
              <polygon points="257,186 264,190 257,194" fill="#34d399" />
              {/* High-Clarity Label Pill */}
              <rect x="231" y="138" width="58" height="18" rx="6" fill="#060913" fillOpacity="0.9" stroke={activeIdx === 1 ? "#34d399" : "rgba(52, 211, 153, 0.4)"} strokeWidth="1" />
              <text x="260" y="151" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Profile</text>
            </g>

            {/* 3. Lane 2 - Stitched Hub: Correlate (Top), Decompose (Mid), Noise (Bottom) */}
            
            {/* Top Node: Correlate (Active Topology Hub - Exact Match to 'Review' in Reference) */}
            <g
              onClick={() => { setActiveIdx(2); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              {/* Outer halo when active */}
              {activeIdx === 2 && (
                <circle cx="450" cy="110" r="44" fill="#00f2fe" opacity="0.18" filter="url(#hubGlow)" />
              )}
              {/* Outer concentric solid ring */}
              <circle cx="450" cy="110" r="33" fill="url(#glowCorrelate)" stroke="#00f2fe" strokeWidth={activeIdx === 2 ? 2.5 : 1.5} strokeOpacity={activeIdx === 2 ? 1 : 0.7} />
              {/* Inner dashed ring */}
              <circle cx="450" cy="110" r="24" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity={activeIdx === 2 ? 1 : 0.6} />
              {/* Core disc */}
              <circle cx="450" cy="110" r="18" fill="#061c28" stroke="#00f2fe" strokeWidth="2" />
              {/* Opposing double arrow chevrons `<| |>` like reference 'Review' node */}
              <polygon points="445,106 441,110 445,114" fill="#00f2fe" />
              <polygon points="455,106 459,110 455,114" fill="#00f2fe" />
              {/* High-Clarity Label Pill */}
              <rect x="412" y="55" width="76" height="20" rx="7" fill="#060913" fillOpacity="0.92" stroke={activeIdx === 2 ? "#00f2fe" : "rgba(0, 242, 254, 0.5)"} strokeWidth="1.2" />
              <text x="450" y="69" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black" letterSpacing="0.02em">
                Correlate
              </text>
            </g>

            {/* Mid Node in Lane 2: Non-Linear / Categorical Decompose */}
            <g
              onClick={() => { setActiveIdx(2); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="450" cy="215" r="23" fill="url(#glowDecompose)" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="3 3" strokeOpacity={activeIdx === 2 ? 0.95 : 0.55} />
              <circle cx="450" cy="215" r="15" fill="#181308" stroke="#fbbf24" strokeWidth="1.8" strokeOpacity={activeIdx === 2 ? 0.95 : 0.65} />
              <polygon points="446,212 450,217 454,212" fill="#fbbf24" />
              <rect x="474" y="206" width="102" height="18" rx="5" fill="#060913" fillOpacity="0.9" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.8" />
              <text x="525" y="219" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="600">
                Decompose (η²)
              </text>
            </g>

            {/* Bottom Node in Lane 2: Pruned Noise (Red/Amber Rejected Node) */}
            <g
              onClick={() => { setActiveIdx(2); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="450" cy="305" r="23" fill="url(#glowNoise)" stroke="#f43f5e" strokeWidth="1.4" strokeDasharray="3 3" strokeOpacity={activeIdx === 2 ? 0.95 : 0.55} />
              <circle cx="450" cy="305" r="15" fill="#1a0910" stroke="#f43f5e" strokeWidth="1.8" strokeOpacity={activeIdx === 2 ? 0.95 : 0.65} />
              <polygon points="446,301 450,307 454,301" fill="#f43f5e" />
              <rect x="474" y="296" width="98" height="18" rx="5" fill="#060913" fillOpacity="0.9" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="0.8" />
              <text x="523" y="309" textAnchor="middle" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="600">
                Pruned Noise
              </text>
            </g>

            {/* 4. Model Node (Lane 3 - Equivalent to 'Approved' in Reference) */}
            <g
              onClick={() => { setActiveIdx(3); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="640" cy="110" r="27" fill="url(#glowModel)" stroke="#a855f7" strokeWidth={activeIdx === 3 ? 2.5 : 1.4} strokeOpacity={activeIdx === 3 ? 1 : 0.65} strokeDasharray={activeIdx === 3 ? "4 3" : "none"} />
              <circle cx="640" cy="110" r="17" fill="#130b1c" stroke="#a855f7" strokeWidth="2" strokeOpacity={activeIdx === 3 ? 1 : 0.8} />
              <polygon points="637,106 644,110 637,114" fill="#a855f7" />
              {/* High-Clarity Label Pill */}
              <rect x="611" y="58" width="58" height="18" rx="6" fill="#060913" fillOpacity="0.9" stroke={activeIdx === 3 ? "#a855f7" : "rgba(168, 85, 247, 0.4)"} strokeWidth="1" />
              <text x="640" y="71" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Model</text>
            </g>

            {/* 5. What-If Simulation Lab Node (Lane 4) */}
            <g
              onClick={() => { setActiveIdx(4); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="790" cy="225" r="27" fill="url(#glowSimulate)" stroke="#fbbf24" strokeWidth={activeIdx === 4 ? 2.5 : 1.4} strokeOpacity={activeIdx === 4 ? 1 : 0.65} strokeDasharray={activeIdx === 4 ? "4 3" : "none"} />
              <circle cx="790" cy="225" r="17" fill="#161208" stroke="#fbbf24" strokeWidth="2" strokeOpacity={activeIdx === 4 ? 1 : 0.8} />
              <polygon points="787,221 794,225 787,229" fill="#fbbf24" />
              {/* High-Clarity Label Pill */}
              <rect x="752" y="172" width="76" height="18" rx="6" fill="#060913" fillOpacity="0.9" stroke={activeIdx === 4 ? "#fbbf24" : "rgba(251, 191, 36, 0.4)"} strokeWidth="1" />
              <text x="790" y="185" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">What-If Lab</text>
            </g>

            {/* 6. Grounded AI Node (Lane 5) */}
            <g
              onClick={() => { setActiveIdx(5); setIsPlaying(false); }}
              className="cursor-pointer group"
            >
              <circle cx="890" cy="150" r="25" fill="url(#glowSynthesis)" stroke="#fb7185" strokeWidth={activeIdx === 5 ? 2.5 : 1.4} strokeOpacity={activeIdx === 5 ? 1 : 0.65} strokeDasharray={activeIdx === 5 ? "4 3" : "none"} />
              <circle cx="890" cy="150" r="16" fill="#180b10" stroke="#fb7185" strokeWidth="2" strokeOpacity={activeIdx === 5 ? 1 : 0.8} />
              <polygon points="887,146 894,150 887,154" fill="#fb7185" />
              {/* High-Clarity Label Pill */}
              <rect x="856" y="98" width="68" height="18" rx="6" fill="#060913" fillOpacity="0.9" stroke={activeIdx === 5 ? "#fb7185" : "rgba(251, 113, 133, 0.4)"} strokeWidth="1" />
              <text x="890" y="111" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">Synthesis</text>
            </g>
          </svg>
        </div>

        {/* Bottom Step Indicator Bar (Exact Match to '3 / 13' and 'REVIEW' in Reference Image) */}
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-mono tracking-widest uppercase text-slate-400 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{activeIdx + 1} / {STEPS.length}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">ACTIVE STAGE</span>
          </div>

          <div className="flex items-center gap-2 font-bold" style={{ color: activeStep.color }}>
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeStep.color }} />
            <span>{activeStep.lane}</span>
          </div>
        </div>

        {/* Interactive Deep-Dive Explanatory Card */}
        <div className="mt-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeStep.color }}
              />
              <h3 className="text-base font-bold text-white tracking-wide">
                Stage {activeIdx + 1}: {activeStep.name}
              </h3>
              <span
                className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border"
                style={{
                  color: activeStep.color,
                  borderColor: `${activeStep.color}60`,
                  backgroundColor: `${activeStep.color}15`,
                }}
              >
                {activeStep.badge}
              </span>
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                disabled={activeIdx === 0}
                onClick={() => {
                  setActiveIdx((prev) => Math.max(0, prev - 1));
                  setIsPlaying(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-20 text-slate-300 transition-colors cursor-pointer"
                title="Previous Stage"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-semibold text-slate-300 px-2">
                {activeIdx + 1} of {STEPS.length}
              </span>
              <button
                disabled={activeIdx === STEPS.length - 1}
                onClick={() => {
                  setActiveIdx((prev) => Math.min(STEPS.length - 1, prev + 1));
                  setIsPlaying(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-20 text-slate-300 transition-colors cursor-pointer"
                title="Next Stage"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {activeStep.description}
          </p>

          {/* Mathematical formulation block */}
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl font-mono text-xs text-cyan-300 flex items-center justify-between overflow-x-auto">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider shrink-0 mr-3">Mathematical Grounding:</span>
            <span className="whitespace-nowrap font-medium">{activeStep.formula}</span>
          </div>

          {/* Technical Guarantees Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {activeStep.guarantees.map((g, gIdx) => (
              <div
                key={gIdx}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70"
              >
                <CheckCircle2
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: activeStep.color }}
                />
                <span className="leading-snug">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
