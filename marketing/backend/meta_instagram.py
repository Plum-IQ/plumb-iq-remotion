"""
meta_instagram.py — Instagram Business posting for Plum-iQ (single-account MVP).

Mount in your FastAPI app:

    from meta_instagram import router as instagram_router
    app.include_router(instagram_router)

Endpoints:
    POST /social/instagram/reel   {video_url, caption?, video_job_id?, share_to_feed?}
    POST /social/instagram/photo  {image_url, caption?, video_job_id?}
    GET  /social/instagram/post/{social_post_id}  -> current status

Instagram uses a 3-step container flow for all media:
  1. POST /{ig-user-id}/media          → container_id  (status starts EXPIRED/IN_PROGRESS)
  2. Poll GET /{container-id}?fields=status_code  until FINISHED
  3. POST /{ig-user-id}/media_publish  with creation_id → published media_id

The URL passed to Instagram must be publicly reachable (S3 / CloudFront output
from Remotion Lambda is fine). Instagram fetches the file server-side.

Requires:  pip install fastapi httpx supabase pydantic
Env:       SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import asyncio

import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from meta_common import (
    BASE,
    get_account,
    create_post,
    update_post,
    get_post,
    handle,
    now_iso,
)

# Poll up to this long before returning "still processing" to the caller.
CONTAINER_POLL_TIMEOUT_S = 90
CONTAINER_POLL_INTERVAL_S = 4

router = APIRouter(prefix="/social/instagram", tags=["instagram"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ReelPost(BaseModel):
    video_url: str
    caption: str | None = None
    video_job_id: str | None = None
    share_to_feed: bool = True          # Reels appear in feed by default


class PhotoPost(BaseModel):
    image_url: str
    caption: str | None = None
    video_job_id: str | None = None


# ---------------------------------------------------------------------------
# Graph API helpers
# ---------------------------------------------------------------------------

async def ig_create_reel_container(ig_user_id: str, token: str, video_url: str, caption: str | None, share_to_feed: bool) -> str:
    """Step 1 for Reels: create a media container. Returns container_id."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{BASE}/{ig_user_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption or "",
                "share_to_feed": "true" if share_to_feed else "false",
                "access_token": token,
            },
        )
    return handle(resp)["id"]


async def ig_create_photo_container(ig_user_id: str, token: str, image_url: str, caption: str | None) -> str:
    """Step 1 for photos: create a media container. Returns container_id."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE}/{ig_user_id}/media",
            data={
                "image_url": image_url,
                "caption": caption or "",
                "access_token": token,
            },
        )
    return handle(resp)["id"]


async def ig_container_status(container_id: str, token: str) -> str:
    """Return the container status_code string, e.g. FINISHED / IN_PROGRESS / ERROR."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE}/{container_id}",
            params={"fields": "status_code", "access_token": token},
        )
    return handle(resp).get("status_code", "IN_PROGRESS")


async def ig_publish_container(ig_user_id: str, container_id: str, token: str) -> str:
    """Step 3: publish the FINISHED container. Returns the published media_id."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE}/{ig_user_id}/media_publish",
            data={"creation_id": container_id, "access_token": token},
        )
    return handle(resp)["id"]


# ---------------------------------------------------------------------------
# Shared polling logic
# ---------------------------------------------------------------------------

async def _poll_and_publish(
    post_id: str,
    ig_user_id: str,
    container_id: str,
    token: str,
    timeout_s: int = CONTAINER_POLL_TIMEOUT_S,
) -> str | None:
    """
    Poll until FINISHED, then publish. Returns the media_id if completed within
    timeout_s, or None if still in progress (caller should background the rest).
    Raises HTTPException on ERROR status.
    """
    waited = 0
    while waited < timeout_s:
        status = await ig_container_status(container_id, token)
        if status == "FINISHED":
            media_id = await ig_publish_container(ig_user_id, container_id, token)
            await update_post(
                post_id,
                status="published",
                external_post_id=media_id,
                posted_at=now_iso(),
            )
            return media_id
        if status == "ERROR":
            await update_post(post_id, status="failed", error_message="Instagram container processing failed")
            raise HTTPException(502, "Instagram reported a container processing error")
        await asyncio.sleep(CONTAINER_POLL_INTERVAL_S)
        waited += CONTAINER_POLL_INTERVAL_S
    return None


async def _finish_container_in_background(
    post_id: str,
    ig_user_id: str,
    container_id: str,
    token: str,
) -> None:
    """Keep polling after the HTTP response has been sent, up to ~4 extra minutes."""
    for _ in range(60):
        await asyncio.sleep(CONTAINER_POLL_INTERVAL_S)
        try:
            status = await ig_container_status(container_id, token)
        except HTTPException:
            continue
        if status == "FINISHED":
            try:
                media_id = await ig_publish_container(ig_user_id, container_id, token)
                await update_post(
                    post_id,
                    status="published",
                    external_post_id=media_id,
                    posted_at=now_iso(),
                )
            except HTTPException:
                await update_post(post_id, status="failed", error_message="Instagram publish step failed")
            return
        if status == "ERROR":
            await update_post(post_id, status="failed", error_message="Instagram container processing failed")
            return


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/reel")
async def post_reel(body: ReelPost, background: BackgroundTasks):
    account = await get_account()
    ig_user_id = account.get("instagram_user_id")
    if not ig_user_id:
        raise HTTPException(400, "Connected account has no linked Instagram Business account")

    token = account["page_access_token"]

    post = await create_post({
        "user_id": account.get("user_id"),
        "social_account_id": account["id"],
        "video_job_id": body.video_job_id,
        "platform": "instagram",
        "post_type": "reel",
        "status": "uploading",
        "media_url": body.video_url,
        "caption": body.caption,
    })

    try:
        container_id = await ig_create_reel_container(
            ig_user_id, token, body.video_url, body.caption, body.share_to_feed
        )
    except HTTPException as exc:
        await update_post(post["id"], status="failed", error_message=str(exc.detail))
        raise

    await update_post(post["id"], status="processing", container_id=container_id)

    media_id = await _poll_and_publish(post["id"], ig_user_id, container_id, token)
    if media_id:
        return {
            "social_post_id": post["id"],
            "status": "published",
            "instagram_media_id": media_id,
        }

    # Timed out — hand off to background and return 202-style response
    background.add_task(_finish_container_in_background, post["id"], ig_user_id, container_id, token)
    return {
        "social_post_id": post["id"],
        "status": "processing",
        "instagram_container_id": container_id,
        "note": "Still processing; poll GET /social/instagram/post/{id} for the final status.",
    }


@router.post("/photo")
async def post_photo(body: PhotoPost, background: BackgroundTasks):
    account = await get_account()
    ig_user_id = account.get("instagram_user_id")
    if not ig_user_id:
        raise HTTPException(400, "Connected account has no linked Instagram Business account")

    token = account["page_access_token"]

    post = await create_post({
        "user_id": account.get("user_id"),
        "social_account_id": account["id"],
        "video_job_id": body.video_job_id,
        "platform": "instagram",
        "post_type": "photo",
        "status": "uploading",
        "media_url": body.image_url,
        "caption": body.caption,
    })

    try:
        container_id = await ig_create_photo_container(ig_user_id, token, body.image_url, body.caption)
    except HTTPException as exc:
        await update_post(post["id"], status="failed", error_message=str(exc.detail))
        raise

    await update_post(post["id"], status="processing", container_id=container_id)

    # Photos usually process in seconds — poll inline first
    media_id = await _poll_and_publish(post["id"], ig_user_id, container_id, token, timeout_s=30)
    if media_id:
        return {
            "social_post_id": post["id"],
            "status": "published",
            "instagram_media_id": media_id,
        }

    background.add_task(_finish_container_in_background, post["id"], ig_user_id, container_id, token)
    return {
        "social_post_id": post["id"],
        "status": "processing",
        "instagram_container_id": container_id,
        "note": "Still processing; poll GET /social/instagram/post/{id} for the final status.",
    }


@router.get("/post/{social_post_id}")
async def post_status(social_post_id: str):
    post = await get_post(social_post_id)

    # Re-check live if still stuck in processing
    if post["status"] == "processing" and post.get("container_id"):
        account = await get_account()
        ig_user_id = account.get("instagram_user_id")
        token = account["page_access_token"]
        status = await ig_container_status(post["container_id"], token)
        if status == "FINISHED":
            try:
                media_id = await ig_publish_container(ig_user_id, post["container_id"], token)
                await update_post(
                    social_post_id,
                    status="published",
                    external_post_id=media_id,
                    posted_at=now_iso(),
                )
                post["status"] = "published"
                post["external_post_id"] = media_id
            except HTTPException:
                await update_post(social_post_id, status="failed", error_message="Instagram publish step failed")
                post["status"] = "failed"
        elif status == "ERROR":
            await update_post(social_post_id, status="failed", error_message="Instagram container processing failed")
            post["status"] = "failed"

    return post
