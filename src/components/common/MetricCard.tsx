import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  icon?: React.ReactNode;
  variant?: "default" | "cyan" | "emerald" | "amber" | "rose";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  variant = "default",
}) => {
  const borders = {
    default: "border-slate-800 bg-slate-900/60",
    cyan: "border-cyan-900/40 bg-cyan-950/20",
    emerald: "border-emerald-900/40 bg-emerald-950/20",
    amber: "border-amber-900/40 bg-amber-950/20",
    rose: "border-rose-900/40 bg-rose-950/20",
  };

  return (
    <div className={`p-4 rounded-xl border ${borders[variant]} flex flex-col justify-between transition-all hover:border-slate-700`}>
      <div className="flex items-center justify-between text-slate-400 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
      {(subtext || trend) && (
        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span>{subtext}</span>
          {trend && <span className="font-medium text-cyan-400">{trend}</span>}
        </div>
      )}
    </div>
  );
};
