"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { Lead, LeadStage, LeadSource } from "../../lib/leads-types";
import { STAGE_LABELS, STAGE_ORDER } from "../../lib/leads-types";
import { leadsApi } from "../../lib/leads-api";
import { ScoreBadge } from "../../components/ScoreBadge";

export default function LeadDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    leadsApi.get(id).then(setLead).catch((e) => setError(e.message));
  }, [id]);

  const startEdit = () => {
    if (!lead) return;
    setDraft({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      stage: lead.stage,
      notes: lead.notes,
      tags: lead.tags,
    });
    setEditing(true);
  };

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await leadsApi.update(lead.id, draft);
      setLead(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    if (!lead || !confirm(`Delete "${lead.name}"?`)) return;
    await leadsApi.delete(lead.id);
    router.push("/leads");
  };

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!lead) return <div className="p-6 animate-pulse text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-sm text-gray-400 hover:text-gray-700">← Pipeline</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          {editing ? (
            <input
              className="text-xl font-bold border-b border-amber-400 focus:outline-none w-full"
              value={draft.name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          ) : (
            <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
          )}
          <ScoreBadge score={lead.score} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <DetailField label="Email" value={lead.email} editValue={draft.email ?? ""} editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
          <DetailField label="Phone" value={lead.phone} editValue={draft.phone ?? ""} editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
          <DetailField label="Company" value={lead.company} editValue={draft.company ?? ""} editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, company: v }))} />
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stage</span>
            {editing ? (
              <select
                value={draft.stage}
                onChange={(e) => setDraft((d) => ({ ...d, stage: e.target.value as LeadStage }))}
                className="block w-full mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 font-medium text-gray-800 capitalize">{STAGE_LABELS[lead.stage]}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Source</span>
            {editing ? (
              <select
                value={draft.source}
                onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value as LeadSource }))}
                className="block w-full mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1"
              >
                {(["organic","referral","direct","social","paid","other"] as LeadSource[]).map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 font-medium text-gray-800 capitalize">{lead.source}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created</span>
            <p className="mt-1 text-gray-600">{new Date(lead.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</span>
          {editing ? (
            <textarea
              rows={3}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className="block w-full mt-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          ) : (
            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{lead.notes || "—"}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg py-2 text-sm transition-colors"
              >
                Edit
              </button>
              <button
                onClick={deleteLead}
                className="px-4 py-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label, value, editValue, editing, onChange,
}: {
  label: string;
  value?: string;
  editValue: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      {editing ? (
        <input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      ) : (
        <p className="mt-1 font-medium text-gray-800">{value || "—"}</p>
      )}
    </div>
  );
}
