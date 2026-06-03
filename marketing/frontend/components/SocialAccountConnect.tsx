"use client";
import React, { useEffect, useState } from "react";
import type { SocialAccount } from "../lib/social-types";
import { socialApi } from "../lib/social-api";

/**
 * Displays connected Meta accounts and a disconnect button.
 * OAuth / token acquisition happens outside this component —
 * pass the token in via the parent after your Meta OAuth redirect completes.
 * The OAUTH_REDIRECT_URI should point to a route that calls socialApi.connectAccount
 * then navigates back here.
 */
export function SocialAccountConnect() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    socialApi.listAccounts().then(setAccounts).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const disconnect = async (id: string) => {
    if (!confirm("Disconnect this account?")) return;
    await socialApi.disconnectAccount(id);
    load();
  };

  const OAUTH_URL =
    `https://www.facebook.com/v20.0/dialog/oauth` +
    `?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_META_REDIRECT_URI ?? "")}` +
    `&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish` +
    `&response_type=code`;

  if (loading) return <div className="animate-pulse h-16 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">No connected Meta accounts</p>
          <a
            href={OAUTH_URL}
            className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Connect Facebook / Instagram
          </a>
        </div>
      ) : (
        accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3"
          >
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {account.facebook_page_name ?? account.facebook_page_id}
              </p>
              {account.instagram_username && (
                <p className="text-xs text-gray-400 mt-0.5">@{account.instagram_username}</p>
              )}
              {account.token_expires_at && (
                <p className="text-xs text-amber-500 mt-0.5">
                  Token expires {new Date(account.token_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => disconnect(account.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ))
      )}
    </div>
  );
}
