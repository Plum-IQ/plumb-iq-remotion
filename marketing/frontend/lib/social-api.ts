import type { SocialAccount, SocialPost, PublishRequest, PublishResponse } from "./social-types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const socialApi = {
  listAccounts(): Promise<SocialAccount[]> {
    return request("/social/accounts");
  },

  disconnectAccount(id: string): Promise<void> {
    return request(`/social/accounts/${id}`, { method: "DELETE" });
  },

  publish(data: PublishRequest): Promise<PublishResponse> {
    return request("/social/publish", { method: "POST", body: JSON.stringify(data) });
  },

  listPosts(videoJobId?: string): Promise<SocialPost[]> {
    const qs = videoJobId ? `?video_job_id=${videoJobId}` : "";
    return request(`/social/posts${qs}`);
  },

  getPost(id: string): Promise<SocialPost> {
    return request(`/social/posts/${id}`);
  },
};
