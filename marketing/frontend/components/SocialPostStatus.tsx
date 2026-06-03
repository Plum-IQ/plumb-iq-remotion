"use client";
import React from "react";
import type { SocialPost, PostStatus } from "../lib/social-types";

const STATUS_CONFIG: Record<PostStatus, { label: string; colour: string; dot: string }> = {
  pending:    { label: "Pending",    colour: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
  uploading:  { label: "Uploading",  colour: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500 animate-pulse" },
  processing: { label: "Processing", colour: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400 animate-pulse" },
  published:  { label: "Published",  colour: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  failed:     { label: "Failed",     colour: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500" },
};

const PLATFORM_ICON: Record<string, string> = {
  facebook:  "f",
  instagram: "ig",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.colour}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function SocialPostRow({ post }: { post: SocialPost }) {
  const icon = PLATFORM_ICON[post.platform] ?? post.platform;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white text-sm">
      <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="capitalize font-medium text-gray-800">{post.platform}</p>
        {post.caption && (
          <p className="text-gray-400 truncate text-xs mt-0.5">{post.caption}</p>
        )}
        {post.error_message && (
          <p className="text-red-500 text-xs mt-0.5">{post.error_message}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <PostStatusBadge status={post.status} />
        {post.posted_at && (
          <span className="text-xs text-gray-400">
            {new Date(post.posted_at).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
