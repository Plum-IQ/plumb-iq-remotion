import React from "react";
import { scoreLabel } from "../lib/leads-types";

const COLOURS = {
  hot:  "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-sky-100 text-sky-700 border-sky-200",
};

const DOTS = {
  hot:  "bg-red-500",
  warm: "bg-amber-400",
  cold: "bg-sky-400",
};

export function ScoreBadge({ score }: { score: number }) {
  const label = scoreLabel(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${COLOURS[label]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[label]}`} />
      {score} · {label}
    </span>
  );
}
