"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { Lead, LeadStage, PipelineResponse } from "../lib/leads-types";
import { STAGE_LABELS, STAGE_ORDER } from "../lib/leads-types";
import { leadsApi } from "../lib/leads-api";
import { LeadCard } from "./LeadCard";

const STAGE_COLOURS: Record<LeadStage, string> = {
  new:       "border-t-sky-400",
  contacted: "border-t-blue-400",
  qualified: "border-t-violet-400",
  proposal:  "border-t-amber-400",
  won:       "border-t-green-400",
  lost:      "border-t-gray-300",
};

export function LeadPipeline() {
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await leadsApi.pipeline();
      setPipeline(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (updated: Lead) => {
    setPipeline((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as PipelineResponse;
      // Remove from all stages, add to the updated stage
      for (const stage of STAGE_ORDER) {
        next[stage] = next[stage].filter((l) => l.id !== updated.id);
      }
      next[updated.stage] = [updated, ...next[updated.stage]];
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setPipeline((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as PipelineResponse;
      for (const stage of STAGE_ORDER) {
        next[stage] = next[stage].filter((l) => l.id !== id);
      }
      return next;
    });
  };

  if (loading) return <PipelineShimmer />;
  if (error) return <p className="text-red-600 p-4">{error}</p>;
  if (!pipeline) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[60vh]">
      {STAGE_ORDER.map((stage) => {
        const leads = pipeline[stage];
        return (
          <div key={stage} className={`bg-gray-50 rounded-xl border-t-4 p-3 flex flex-col gap-3 ${STAGE_COLOURS[stage]}`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-700">{STAGE_LABELS[stage]}</span>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                {leads.length}
              </span>
            </div>
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PipelineShimmer() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAGE_ORDER.map((s) => (
        <div key={s} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
      ))}
    </div>
  );
}
