export type SocialPlatform = "facebook" | "instagram";
export type PostStatus = "pending" | "uploading" | "processing" | "published" | "failed";
export type PostType = "video" | "reel";

export interface SocialAccount {
  id: string;
  provider: string;
  facebook_page_id?: string;
  facebook_page_name?: string;
  instagram_user_id?: string;
  instagram_username?: string;
  is_active: boolean;
  token_expires_at?: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  post_type?: PostType;
  status: PostStatus;
  external_post_id?: string;
  container_id?: string;
  media_url?: string;
  caption?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  posted_at?: string;
}

export interface PublishRequest {
  social_account_id: string;
  video_job_id: string;
  media_url: string;
  caption: string;
  platforms: SocialPlatform[];
  post_type?: PostType;
}

export interface PublishResponse {
  posts: SocialPost[];
}
