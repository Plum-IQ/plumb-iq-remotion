"""
Meta Graph API client for Facebook Page video posts and Instagram Reels.

Facebook flow:
  POST /{page-id}/videos  with file_url + access_token → returns {id}

Instagram 3-step flow:
  1. POST /{ig-user-id}/media          → container_id
  2. Poll  GET /{container-id}?fields=status_code  until FINISHED
  3. POST /{ig-user-id}/media_publish  with creation_id → post id
"""

import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v22.0"
MAX_POLL_ATTEMPTS = 20
POLL_INTERVAL_SEC = 3


class MetaAPIError(Exception):
    def __init__(self, message: str, code: int | None = None):
        super().__init__(message)
        self.code = code


async def _post(client: httpx.AsyncClient, url: str, data: dict) -> dict:
    resp = await client.post(url, data=data, timeout=30)
    body = resp.json()
    if "error" in body:
        err = body["error"]
        raise MetaAPIError(err.get("message", "Unknown Meta error"), err.get("code"))
    return body


async def _get(client: httpx.AsyncClient, url: str, params: dict) -> dict:
    resp = await client.get(url, params=params, timeout=15)
    body = resp.json()
    if "error" in body:
        err = body["error"]
        raise MetaAPIError(err.get("message", "Unknown Meta error"), err.get("code"))
    return body


# ---------------------------------------------------------------------------
# Facebook
# ---------------------------------------------------------------------------

async def post_facebook_video(
    *,
    page_id: str,
    access_token: str,
    media_url: str,
    caption: str,
) -> str:
    """Upload a video to a Facebook Page by URL. Returns the FB post id."""
    async with httpx.AsyncClient() as client:
        data = await _post(
            client,
            f"{GRAPH}/{page_id}/videos",
            {
                "file_url": media_url,
                "description": caption,
                "published": "true",
                "access_token": access_token,
            },
        )
    post_id = data.get("id")
    if not post_id:
        raise MetaAPIError("Facebook video upload returned no post id")
    return post_id


# ---------------------------------------------------------------------------
# Instagram (3-step container flow)
# ---------------------------------------------------------------------------

async def create_instagram_container(
    *,
    ig_user_id: str,
    access_token: str,
    media_url: str,
    caption: str,
    is_reel: bool = True,
) -> str:
    """Step 1: create an IG media container. Returns container_id."""
    async with httpx.AsyncClient() as client:
        data = await _post(
            client,
            f"{GRAPH}/{ig_user_id}/media",
            {
                "video_url": media_url,
                "caption": caption,
                "media_type": "REELS" if is_reel else "VIDEO",
                "access_token": access_token,
            },
        )
    container_id = data.get("id")
    if not container_id:
        raise MetaAPIError("Instagram container creation returned no id")
    return container_id


async def poll_instagram_container(
    *,
    container_id: str,
    access_token: str,
) -> None:
    """Step 2: poll until Instagram finishes processing the container."""
    async with httpx.AsyncClient() as client:
        for attempt in range(MAX_POLL_ATTEMPTS):
            data = await _get(
                client,
                f"{GRAPH}/{container_id}",
                {"fields": "status_code", "access_token": access_token},
            )
            status = data.get("status_code", "")
            if status == "FINISHED":
                return
            if status == "ERROR":
                raise MetaAPIError(f"Instagram container processing failed (attempt {attempt + 1})")
            await asyncio.sleep(POLL_INTERVAL_SEC)
    raise MetaAPIError("Instagram container timed out before FINISHED")


async def publish_instagram_container(
    *,
    ig_user_id: str,
    container_id: str,
    access_token: str,
) -> str:
    """Step 3: publish the container. Returns the IG media id."""
    async with httpx.AsyncClient() as client:
        data = await _post(
            client,
            f"{GRAPH}/{ig_user_id}/media_publish",
            {
                "creation_id": container_id,
                "access_token": access_token,
            },
        )
    media_id = data.get("id")
    if not media_id:
        raise MetaAPIError("Instagram publish returned no media id")
    return media_id


async def post_instagram_video(
    *,
    ig_user_id: str,
    access_token: str,
    media_url: str,
    caption: str,
    is_reel: bool = True,
) -> tuple[str, str]:
    """Full 3-step flow. Returns (container_id, media_id)."""
    container_id = await create_instagram_container(
        ig_user_id=ig_user_id,
        access_token=access_token,
        media_url=media_url,
        caption=caption,
        is_reel=is_reel,
    )
    await poll_instagram_container(container_id=container_id, access_token=access_token)
    media_id = await publish_instagram_container(
        ig_user_id=ig_user_id,
        container_id=container_id,
        access_token=access_token,
    )
    return container_id, media_id
