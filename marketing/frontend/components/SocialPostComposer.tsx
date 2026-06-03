"use client";
import React, { useEffect, useState } from "react";
import type { SocialAccount, SocialPlatform, PostType } from "../lib/social-types";
import { socialApi } from "../lib/social-api";
import { SocialPostRow } from "./SocialPostStatus";

interface Props {
  videoJobId: string;
  mediaUrl: string;
  defaultCaption?: string;
  onPublished?: () => void;
}

export function SocialPostComposer({ videoJobId, mediaUrl, defaultCaption = "", onPublished }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [caption, setCaption] = useState(defaultCaption);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["facebook", "instagram"]);
  const [postType, setPostType] = useState<PostType>("reel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof socialApi.publish>>["posts"]>([]);

  useEffect(() => {
    socialApi.listAccounts().then((data) => {
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0].id);
    });
  }, []);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const account = accounts.find((a) => a.id === selectedAccount);
  const igAvailable = !!account?.instagram_user_id;

  const submit = async () => {
    if (!selectedAccount || platforms.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await socialApi.publish({
        social_account_id: selectedAccount,
        video_job_id: videoJobId,
        media_url: mediaUrl,
        caption,
        platforms,
        post_type: postType,
      });
      setPosts(res.posts);
      setPublished(true);
      onPublished?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  };

  if (published) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-green-700">
          Publishing started — tracking below:
        </p>
        {posts.map((p) => (
          <SocialPostRow key={p.id} post={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Account selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Connected account</label>
        {accounts.length === 0 ? (
          <p className="text-sm text-amber-600">
            No connected accounts. Connect a Meta account first.
          </p>
        ) : (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.facebook_page_name ?? a.facebook_page_id}
                {a.instagram_username ? ` · @${a.instagram_username}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Platform toggles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Post to</label>
        <div className="flex gap-3">
          {(["facebook", "instagram"] as SocialPlatform[]).map((p) => {
            const disabled = p === "instagram" && !igAvailable;
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => togglePlatform(p)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize
                  ${disabled ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400" :
                    active ? "border-amber-400 bg-amber-50 text-amber-700" :
                    "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                {p === "instagram" && !igAvailable ? `${p} (no IG linked)` : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Post type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
        <div className="flex gap-3">
          {(["reel", "video"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPostType(t)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors
                ${postType === t ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
        <textarea
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write your caption…"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{caption.length} chars</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading || accounts.length === 0 || platforms.length === 0}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
      >
        {loading ? "Publishing…" : `Publish to ${platforms.join(" + ")}`}
      </button>
    </div>
  );
}
