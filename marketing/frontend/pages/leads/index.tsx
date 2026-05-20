"use client";
import React, { useState } from "react";
import { LeadPipeline } from "../../components/LeadPipeline";
import { LeadCaptureForm } from "../../components/LeadCaptureForm";

export default function LeadsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag leads through stages or use the → buttons on each card</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 text-sm transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Lead"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">New Lead</h2>
          <LeadCaptureForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <LeadPipeline />
    </div>
  );
}
