"use client";
import React, { useState } from "react";
import { leadsApi } from "../lib/leads-api";
import type { LeadCreate, LeadSource } from "../lib/leads-types";

interface Props {
  formId?: string;
  onSuccess?: () => void;
  className?: string;
}

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "organic",  label: "Search / Organic" },
  { value: "referral", label: "Referral" },
  { value: "social",   label: "Social Media" },
  { value: "paid",     label: "Paid Ad" },
  { value: "direct",   label: "Direct" },
  { value: "other",    label: "Other" },
];

export function LeadCaptureForm({ formId, onSuccess, className = "" }: Props) {
  const [fields, setFields] = useState<LeadCreate>({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "other",
    form_id: formId,
    referrer_url: typeof window !== "undefined" ? document.referrer || undefined : undefined,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof LeadCreate) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await leadsApi.create(fields);
      setSubmitted(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`rounded-xl border border-green-200 bg-green-50 p-6 text-center ${className}`}>
        <div className="text-2xl mb-2">✓</div>
        <p className="font-semibold text-green-800">Thanks! We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name *" value={fields.name} onChange={set("name")} required />
        <Field label="Email *" type="email" value={fields.email} onChange={set("email")} required />
        <Field label="Phone" type="tel" value={fields.phone ?? ""} onChange={set("phone")} />
        <Field label="Company" value={fields.company ?? ""} onChange={set("company")} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
        <select
          value={fields.source}
          onChange={set("source")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 transition-colors"
      >
        {loading ? "Sending…" : "Get in Touch"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}
