"use client";
import React, { useEffect, useState } from "react";
import { SocialAccountConnect } from "../../components/SocialAccountConnect";
import { SocialPostRow } from "../../components/SocialPostStatus";
import { socialApi } from "../../lib/social-api";
import type { SocialPost } from "../../lib/social-types";

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [tab, setTab] = useState<"accounts" | "history">("accounts");

  useEffect(() => {
    if (tab === "history") {
      socialApi.listPosts().then(setPosts);
    }
  }, [tab]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Publishing</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Publish rendered videos directly to Facebook and Instagram
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["accounts", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
              ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "accounts" && <SocialAccountConnect />}

      {tab === "history" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No posts yet.</p>
          ) : (
            posts.map((p) => <SocialPostRow key={p.id} post={p} />)
          )}
        </div>
      )}
    </div>
  );
}
