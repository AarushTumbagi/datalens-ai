import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "cyan" | "blue" | "emerald" | "amber" | "rose" | "slate";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "slate",
  size = "sm",
  className = "",
}) => {
  const variantStyles = {
    cyan: "bg-cyan-950/80 text-cyan-300 border-cyan-800/60",
    blue: "bg-blue-950/80 text-blue-300 border-blue-800/60",
    emerald: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
    amber: "bg-amber-950/80 text-amber-300 border-amber-800/60",
    rose: "bg-rose-950/80 text-rose-300 border-rose-800/60",
    slate: "bg-slate-800/80 text-slate-300 border-slate-700/60",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
