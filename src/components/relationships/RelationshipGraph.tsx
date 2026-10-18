import React, { useState, useEffect, useRef, useMemo } from "react";
import { DatasetProfile, RelationshipGraph as IRelationshipGraph, GraphNode, GraphEdge, PairwiseDetail } from "../../types/api";
import { api } from "../../services/api";
import { Sparkline } from "../common/Sparkline";
import { Badge } from "../common/Badge";
import {
  Share2, Sliders, Search, RotateCcw, AlertCircle, Info, Sparkles,
  TrendingUp, X, HelpCircle, Eye, Compass, Layers, Target
} from "lucide-react";

interface RelationshipGraphProps {
  profile: DatasetProfile;
  onSelectVariable: (varName: string) => void;
}

type GraphViewMode = "top-drivers" | "focus-ego" | "full-network";

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  profile,
  onSelectVariable,
}) => {
  const isLargeDataset = profile.column_count > 20;

  // View settings
  const [viewMode, setViewMode] = useState<GraphViewMode>(isLargeDataset ? "top-drivers" : "full-network");
  const [threshold, setThreshold] = useState<number>(isLargeDataset ? 0.45 : 0.25);
  const [egoFocusNode, setEgoFocusNode] = useState<string>(profile.columns[0]?.name || "");

  const [rawGraphData, setRawGraphData] = useState<IRelationshipGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [pairwiseDetail, setPairwiseDetail] = useState<PairwiseDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Filtered nodes and edges based on View Mode to completely eliminate cognitive overload
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!rawGraphData) return { displayNodes: [], displayEdges: [] };

    let edges = [...rawGraphData.edges];

    // Filter by threshold
    edges = edges.filter((e) => e.abs_value >= threshold);

    if (viewMode === "top-drivers") {
      // Keep only top 2 strongest connections per variable to prevent hairball
      const edgeScores: Record<string, GraphEdge[]> = {};
      for (const e of edges) {
        if (!edgeScores[e.source]) edgeScores[e.source] = [];
        if (!edgeScores[e.target]) edgeScores[e.target] = [];
        edgeScores[e.source].push(e);
        edgeScores[e.target].push(e);
      }

      const keptEdgeIds = new Set<string>();
      for (const col of Object.keys(edgeScores)) {
        const sorted = edgeScores[col].sort((a, b) => b.abs_value - a.abs_value);
        sorted.slice(0, 2).forEach((e) => keptEdgeIds.add(e.id));
      }
      edges = edges.filter((e) => keptEdgeIds.has(e.id));
    } else if (viewMode === "focus-ego" && egoFocusNode) {
      // Only keep direct 1st degree connections to the ego node
      edges = edges.filter((e) => e.source === egoFocusNode || e.target === egoFocusNode);
    }

    // Nodes that are either connected or present
    const connectedNodeIds = new Set<string>();
    edges.forEach((e) => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    let nodes = rawGraphData.nodes;
    if (viewMode === "focus-ego" && egoFocusNode) {
      nodes = nodes.filter((n) => n.id === egoFocusNode || connectedNodeIds.has(n.id));
    } else if (isLargeDataset && viewMode === "top-drivers") {
      nodes = nodes.filter((n) => connectedNodeIds.has(n.id));
    }

    return { displayNodes: nodes, displayEdges: edges };
  }, [rawGraphData, threshold, viewMode, egoFocusNode, isLargeDataset]);

  // Simulation physics state
  const simNodesRef = useRef<Array<GraphNode & { x: number; y: number; vx: number; vy: number; radius: number }>>([]);
  const simEdgesRef = useRef<GraphEdge[]>([]);

  useEffect(() => {
    loadGraph();
  }, [profile.dataset_id]);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      // Load raw graph with baseline 0.15 cutoff
      const data = await api.getRelationshipGraph(profile.dataset_id, 0.15);
      setRawGraphData(data);
      if (data.nodes[0] && !egoFocusNode) {
        setEgoFocusNode(data.nodes[0].id);
      }
    } catch (err) {
      console.error("Failed to load relationship graph:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-initialize physics whenever displayNodes or displayEdges change
  useEffect(() => {
    const width = 940;
    const height = 580;
    const n = displayNodes.length;
    if (n === 0) return;

    // Compact radius for large datasets to prevent overlap
    const baseRadius = n > 30 ? 8 : n > 15 ? 12 : 16;

    if (viewMode === "focus-ego" && egoFocusNode) {
      // Radial layout around center ego node with generous distancing
      const center = { x: width / 2, y: height / 2 };
      const otherNodes = displayNodes.filter((nd) => nd.id !== egoFocusNode);
      const angleStep = (2 * Math.PI) / (otherNodes.length || 1);

      simNodesRef.current = displayNodes.map((nd) => {
        if (nd.id === egoFocusNode) {
          return { ...nd, x: center.x, y: center.y, vx: 0, vy: 0, radius: 22 };
        }
        const idx = otherNodes.findIndex((o) => o.id === nd.id);
        const angle = idx * angleStep;
        // Ample radial distance based on relationship strength
        const edge = displayEdges.find((e) => (e.source === nd.id && e.target === egoFocusNode) || (e.target === nd.id && e.source === egoFocusNode));
        const dist = edge ? Math.max(140, 310 - edge.abs_value * 170) : 230;
        return {
          ...nd,
          x: center.x + Math.cos(angle) * dist,
          y: center.y + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius: baseRadius,
        };
      });
    } else {
      // Spacious circular ring with jitter
      const angleStep = (2 * Math.PI) / (n || 1);
      simNodesRef.current = displayNodes.map((nd, idx) => {
        const angle = idx * angleStep;
        const dist = 210 + (idx % 3 === 0 ? 35 : idx % 3 === 1 ? -30 : 0);
        return {
          ...nd,
          x: width / 2 + Math.cos(angle) * dist,
          y: height / 2 + Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          radius: baseRadius,
        };
      });
    }

    simEdgesRef.current = displayEdges;
    startSimulation();
  }, [displayNodes, displayEdges, viewMode, egoFocusNode]);

  const startSimulation = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    let step = 0;
    const animate = () => {
      step++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;

      // Force relaxation (first 120 frames with generous electrostatic distancing)
      if (step < 120 && viewMode !== "focus-ego") {
        const n = nodes.length;
        const minDistBase = n > 30 ? 45 : n > 15 ? 58 : 72;

        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = nodes[i].radius + nodes[j].radius + minDistBase;
            if (dist < minDist) {
              const force = ((minDist - dist) / dist) * 0.12;
              nodes[i].vx -= dx * force;
              nodes[i].vy -= dy * force;
              nodes[j].vx += dx * force;
              nodes[j].vy += dy * force;
            }
          }
        }

        for (const edge of edges) {
          const s = nodes.find((n) => n.id === edge.source);
          const t = nodes.find((n) => n.id === edge.target);
          if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 135 / Math.max(0.3, edge.abs_value);
            const force = (dist - targetDist) * 0.015;
            s.vx += (dx / dist) * force;
            s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force;
            t.vy -= (dy / dist) * force;
          }
        }

        for (const node of nodes) {
          node.vx += (width / 2 - node.x) * 0.005;
          node.vy += (height / 2 - node.y) * 0.005;
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x = Math.max(45, Math.min(width - 45, node.x + node.vx));
          node.y = Math.max(45, Math.min(height - 45, node.y + node.vy));
        }
      }

      ctx.clearRect(0, 0, width, height);

      const activeFocus = hoveredNode || selectedNode;

      // Draw Edges
      for (const edge of edges) {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (!s || !t) continue;

        const isEdgeSelected = selectedEdge?.id === edge.id;
        const isEdgeHovered = hoveredEdge?.id === edge.id;
        const isConnectedToFocus = activeFocus && (activeFocus.id === s.id || activeFocus.id === t.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (activeFocus && !isConnectedToFocus) {
          // Dim unrelated edges
          ctx.strokeStyle = "rgba(51, 65, 85, 0.12)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          continue;
        }

        const strokeWidth = Math.max(1, edge.abs_value * 3.5);
        ctx.lineWidth = (isEdgeSelected || isEdgeHovered) ? strokeWidth + 2 : strokeWidth;

        if (isEdgeSelected || isEdgeHovered) {
          ctx.strokeStyle = "#00f2fe";
          ctx.shadowColor = "#00f2fe";
          ctx.shadowBlur = 10;
        } else if (isConnectedToFocus) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.9)";
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 6;
        } else if (edge.direction === "positive") {
          ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0.25, edge.abs_value * 0.8)})`;
          ctx.shadowBlur = 0;
        } else if (edge.direction === "negative") {
          ctx.strokeStyle = `rgba(244, 63, 94, ${Math.max(0.25, edge.abs_value * 0.8)})`;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = `rgba(129, 140, 248, ${Math.max(0.25, edge.abs_value * 0.8)})`;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ONLY draw edge metric labels on hovered/selected or in Focus-Ego mode!
        // This eliminates 98% of the cognitive clutter seen in dense datasets!
        if (isEdgeSelected || isEdgeHovered || isConnectedToFocus || viewMode === "focus-ego") {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.fillStyle = (isEdgeSelected || isEdgeHovered) ? "#00f2fe" : "#E2E8F0";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          // Background pill for label legibility
          const text = `${edge.value > 0 ? "+" : ""}${edge.value.toFixed(2)}`;
          const textW = ctx.measureText(text).width + 8;
          ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
          ctx.fillRect(midX - textW / 2, midY - 11, textW, 14);
          ctx.strokeStyle = (isEdgeSelected || isEdgeHovered) ? "#00f2fe" : "#334155";
          ctx.lineWidth = 1;
          ctx.strokeRect(midX - textW / 2, midY - 11, textW, 14);
          ctx.fillStyle = (isEdgeSelected || isEdgeHovered) ? "#00f2fe" : "#94A3B8";
          ctx.fillText(text, midX, midY);
        }
      }

      // Draw Nodes
      for (const node of nodes) {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isEgoCenter = viewMode === "focus-ego" && node.id === egoFocusNode;
        const isMatchedSearch = searchTerm && node.label.toLowerCase().includes(searchTerm.toLowerCase());
        const isConnectedToFocus = activeFocus && (
          activeFocus.id === node.id ||
          edges.some((e) => (e.source === activeFocus.id && e.target === node.id) || (e.target === activeFocus.id && e.source === node.id))
        );

        const isDimmed = activeFocus && !isConnectedToFocus;

        // Node palette definitions (vibrant yet subtle and distinct)
        let highlightColor = "#38bdf8";
        let baseColor = "#0284c7";
        let borderColor = "rgba(125, 211, 252, 0.85)";
        let haloColor = "rgba(56, 189, 248, 0.22)";

        if (isEgoCenter) {
          highlightColor = "#f472b6";
          baseColor = "#a855f7";
          borderColor = "rgba(244, 114, 182, 0.95)";
          haloColor = "rgba(168, 85, 247, 0.35)";
        } else if (node.type === "numerical") {
          highlightColor = "#38bdf8";
          baseColor = "#0284c7";
          borderColor = "rgba(125, 211, 252, 0.85)";
          haloColor = "rgba(56, 189, 248, 0.22)";
        } else if (node.type === "categorical") {
          highlightColor = "#d8b4fe";
          baseColor = "#7c3aed";
          borderColor = "rgba(192, 132, 252, 0.85)";
          haloColor = "rgba(124, 58, 237, 0.22)";
        } else {
          highlightColor = "#6ee7b7";
          baseColor = "#059669";
          borderColor = "rgba(110, 231, 183, 0.85)";
          haloColor = "rgba(16, 185, 129, 0.22)";
        }

        // 1. Soft diffuse ambient halo (colourful yet subtle)
        ctx.beginPath();
        const haloRadius = (isSelected || isHovered || isEgoCenter) ? node.radius + 7 : node.radius + 3.5;
        ctx.arc(node.x, node.y, haloRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isDimmed ? "rgba(30, 41, 59, 0.15)" : (isSelected || isHovered || isEgoCenter) ? `${haloColor.replace("0.22", "0.45")}` : haloColor;
        ctx.fill();

        // 2. Node Core Disc with Luminous Radial Gradient
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        if (isDimmed) {
          ctx.fillStyle = "#1e293b";
        } else {
          const grad = ctx.createRadialGradient(
            node.x - node.radius * 0.35,
            node.y - node.radius * 0.35,
            node.radius * 0.1,
            node.x,
            node.y,
            node.radius
          );
          grad.addColorStop(0, isSelected || isHovered ? "#ffffff" : highlightColor);
          grad.addColorStop(1, baseColor);
          ctx.fillStyle = grad;
        }
        ctx.fill();

        // 3. Crisp Edge Ring
        ctx.lineWidth = isSelected || isHovered || isEgoCenter ? 2.5 : 1.6;
        ctx.strokeStyle = isDimmed ? "#334155" : (isSelected || isHovered || isEgoCenter) ? "#FFFFFF" : borderColor;
        ctx.stroke();

        // 4. Center jewel pinpoint dot for crisp precision
        if (!isDimmed) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, Math.max(1.2, node.radius * 0.2), 0, 2 * Math.PI);
          ctx.fillStyle = isSelected || isHovered || isEgoCenter ? "#FFFFFF" : "rgba(255, 255, 255, 0.85)";
          ctx.fill();
        }

        // 5. High-Clarity Node Label with Backing Pill
        const showLabel = nodes.length <= 18 || isSelected || isHovered || isConnectedToFocus || isMatchedSearch || isEgoCenter;

        if (showLabel && !isDimmed) {
          const labelText = node.label.length > 15 ? node.label.substring(0, 13) + "…" : node.label;
          ctx.font = (isSelected || isHovered || isEgoCenter) ? "bold 11px system-ui, sans-serif" : "500 10px system-ui, sans-serif";
          ctx.textAlign = "center";
          const textW = ctx.measureText(labelText).width;
          const pillY = node.y + node.radius + 8;
          const px = node.x - textW / 2 - 5;
          const py = pillY - 9;
          const pw = textW + 10;
          const ph = 14;

          // Translucent dark backing pill so crossing lines never obscure text
          ctx.fillStyle = "rgba(10, 15, 26, 0.88)";
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = (isSelected || isHovered || isEgoCenter) ? borderColor : "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(px, py, pw, ph);

          // Pure crisp text
          ctx.fillStyle = (isSelected || isHovered || isEgoCenter) ? "#FFFFFF" : "#F8FAFC";
          ctx.fillText(labelText, node.x, pillY + 2);
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const hitNode = simNodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (hitNode) {
      setHoveredNode(hitNode);
      setHoveredEdge(null);
      return;
    }

    setHoveredNode(null);

    // Check edge hover
    for (const edge of simEdgesRef.current) {
      const s = simNodesRef.current.find((n) => n.id === edge.source);
      const t = simNodesRef.current.find((n) => n.id === edge.target);
      if (s && t) {
        const l2 = (t.x - s.x) * (t.x - s.x) + (t.y - s.y) * (t.y - s.y);
        if (l2 === 0) continue;
        const param = Math.max(0, Math.min(1, ((x - s.x) * (t.x - s.x) + (y - s.y) * (t.y - s.y)) / l2));
        const projX = s.x + param * (t.x - s.x);
        const projY = s.y + param * (t.y - s.y);
        const dist = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
        if (dist <= 7) {
          setHoveredEdge(edge);
          return;
        }
      }
    }
    setHoveredEdge(null);
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const clickedNode = simNodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setSelectedEdge(null);
      setPairwiseDetail(null);
      onSelectVariable(clickedNode.label);
      if (viewMode === "focus-ego") {
        setEgoFocusNode(clickedNode.label);
      }
      return;
    }

    for (const edge of simEdgesRef.current) {
      const s = simNodesRef.current.find((n) => n.id === edge.source);
      const t = simNodesRef.current.find((n) => n.id === edge.target);
      if (s && t) {
        const l2 = (t.x - s.x) * (t.x - s.x) + (t.y - s.y) * (t.y - s.y);
        if (l2 === 0) continue;
        const param = Math.max(0, Math.min(1, ((x - s.x) * (t.x - s.x) + (y - s.y) * (t.y - s.y)) / l2));
        const projX = s.x + param * (t.x - s.x);
        const projY = s.y + param * (t.y - s.y);
        const dist = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
        if (dist <= 8) {
          setSelectedEdge(edge);
          setSelectedNode(null);
          try {
            const detail = await api.getPairwiseDetail(profile.dataset_id, edge.source, edge.target);
            setPairwiseDetail(detail);
          } catch (err) {
            console.error(err);
          }
          return;
        }
      }
    }

    setSelectedNode(null);
    setSelectedEdge(null);
    setPairwiseDetail(null);
  };

  return (
    <div className="space-y-5">
      {/* "What is happening here?" Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900/40 border border-blue-800/40 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-lg shadow-blue-950/20">
        <div className="p-2 bg-blue-900/40 border border-blue-700/60 rounded-xl text-blue-300 shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
            <span>Relationship Graph • Cognitive Load Reducer</span>
            <span className="text-[10px] uppercase px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded font-bold">
              {displayEdges.length} Clean Links ({profile.column_count} Variables)
            </span>
          </h4>
          <p className="text-slate-300 leading-relaxed">
            In large datasets, rendering every weak correlation produces an illegible "hairball".
            Use <strong>Top Drivers</strong> to see only the primary structural backbone, or switch to <strong>Focus Mode</strong> to isolate one variable and its direct correlates.
            Hover over any node or link to illuminate its evidence.
          </p>
        </div>
      </div>

      {/* View Mode & De-clutter Toolbar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md shadow-lg">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setViewMode("top-drivers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "top-drivers"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Top Drivers (Clean Backbone)</span>
          </button>
          <button
            onClick={() => setViewMode("focus-ego")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "focus-ego"
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md shadow-purple-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Focus Mode (Ego Network)</span>
          </button>
          <button
            onClick={() => setViewMode("full-network")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === "full-network"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Network</span>
          </button>
        </div>

        {/* Focus Mode Target Picker (if in focus mode) */}
        {viewMode === "focus-ego" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-purple-300 font-semibold">Anchor Variable:</span>
            <select
              value={egoFocusNode}
              onChange={(e) => setEgoFocusNode(e.target.value)}
              className="bg-purple-950/80 border border-purple-700/80 rounded-xl px-3 py-1.5 text-purple-200 focus:outline-none focus:border-cyan-400 font-semibold"
            >
              {profile.columns.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Association Threshold Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Cutoff:</span>
            <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
              |r| ≥ {threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.85"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-32 accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Search Input */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Highlight variable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Network Canvas & Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas viewport */}
        <div className="lg:col-span-3 bg-slate-950/85 border border-slate-800/80 rounded-2xl overflow-hidden relative shadow-2xl backdrop-blur-md">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="flex items-center gap-2 text-xs text-cyan-400">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Relaxing network topology...</span>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={940}
            height={580}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoveredNode(null);
              setHoveredEdge(null);
            }}
            className="w-full h-[580px] cursor-crosshair block"
          />

          {/* Active Status Badge */}
          <div className="absolute bottom-3 left-3 text-[11px] text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md shadow-lg flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{displayNodes.length} Nodes</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{displayEdges.length} Filtered Links</span>
            </div>
            {isLargeDataset && (
              <>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">De-cluttered for high cognition</span>
              </>
            )}
          </div>
        </div>

        {/* Selected Node or Edge Inspector Card */}
        <div className="p-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          {selectedNode ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Inspecting Variable</div>
                  <h4 className="text-base font-bold text-slate-100">{selectedNode.label}</h4>
                </div>
                <Badge variant={selectedNode.type === "numerical" ? "cyan" : "slate"}>
                  {selectedNode.type}
                </Badge>
              </div>

              {/* Connected distribution sparkline preview */}
              <div className="my-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-300">Empirical Distribution</div>
                {(() => {
                  const colProf = profile.columns.find((c) => c.name === selectedNode.label);
                  return (
                    <Sparkline
                      bins={colProf?.histogram_bins}
                      width={200}
                      height={44}
                      color="#00f2fe"
                    />
                  );
                })()}
              </div>

              {/* Node Stats */}
              <div className="space-y-2 text-xs">
                {Object.entries(selectedNode.stats).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400 capitalize">{k.replace("_", " ")}:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>

              {/* Connected edges list */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">Strongest Associations</div>
                {displayEdges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 5).map((e) => {
                  const other = e.source === selectedNode.id ? e.target : e.source;
                  return (
                    <div key={e.id} className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between">
                      <span className="text-slate-300 font-medium truncate max-w-[120px]">{other}</span>
                      <span className={`font-mono font-bold ${e.value > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {e.value > 0 ? "+" : ""}{e.value.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedEdge && pairwiseDetail ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pairwise Association</div>
                  <h4 className="text-sm font-bold text-slate-100">{pairwiseDetail.var1} ↔ {pairwiseDetail.var2}</h4>
                </div>
                <Badge variant={pairwiseDetail.metric_value > 0 ? "emerald" : "rose"}>
                  {pairwiseDetail.metric_name}
                </Badge>
              </div>

              {/* Micro Scatter Plot with Trend Line */}
              <div className="my-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Scatter Plot & Trend</span>
                  <span className="font-mono text-cyan-400 font-bold">{pairwiseDetail.metric_value}</span>
                </div>
                <svg viewBox="0 0 200 120" className="w-full h-28">
                  {pairwiseDetail.scatter_sample.slice(0, 80).map((pt, i) => {
                    const x = (i * 2.2) % 180 + 10;
                    const y = 110 - ((i * 3.1 + 15) % 90);
                    return <circle key={i} cx={x} cy={y} r={2} fill="#00f2fe" opacity={0.65} />;
                  })}
                  {pairwiseDetail.trend_line && (
                    <line x1="10" y1="100" x2="190" y2="20" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
                  )}
                </svg>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p className="leading-relaxed">{pairwiseDetail.interpretation}</p>
                <div className="p-2.5 bg-amber-950/40 border border-amber-900/60 rounded-xl text-[11px] text-amber-200/90 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{pairwiseDetail.limitations}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400 shadow-md">
                <Share2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium max-w-[200px] mx-auto text-slate-300">
                Click any variable node or association link to inspect empirical distributions and statistical evidence.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
