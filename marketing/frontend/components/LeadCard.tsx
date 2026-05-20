"use client";
import React from "react";
import Link from "next/link";
import type { Lead, LeadStage } from "../lib/leads-types";
import { ScoreBadge } from "./ScoreBadge";
import { leadsApi } from "../lib/leads-api";

const NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  new:       "contacted",
  contacted: "qualified",
  qualified: "proposal",
  proposal:  "won",
};

interface Props {
  lead: Lead;
  onUpdate: (updated: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadCard({ lead, onUpdate, onDelete }: Props) {
  const nextStage = NEXT_STAGE[lead.stage];

  const advance = async () => {
    if (!nextStage) return;
    const updated = await leadsApi.update(lead.id, { stage: nextStage });
    onUpdate(updated);
  };

  const remove = async () => {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    await leadsApi.delete(lead.id);
    onDelete(lead.id);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-amber-600 truncate">
          {lead.name}
        </Link>
        <ScoreBadge score={lead.score} />
      </div>

      <div className="space-y-1 text-sm text-gray-500">
        <p className="truncate">{lead.email}</p>
        {lead.phone && <p>{lead.phone}</p>}
        {lead.company && <p className="font-medium text-gray-700">{lead.company}</p>}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="capitalize">{lead.source}</span>
        <span>·</span>
        <span>{new Date(lead.created_at).toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {nextStage && (
          <button
            onClick={advance}
            className="flex-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded-lg py-1.5 px-2 transition-colors"
          >
            → Move to {nextStage}
          </button>
        )}
        <button
          onClick={remove}
          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
