"""
Social posting routes — mount in your FastAPI app:

    from marketing.social_routes import router as social_router
    app.include_router(social_router, prefix="/social", tags=["social"])

All DB access uses the Supabase service-role client (bypasses RLS).
Replace the `get_supabase` dependency with your actual client factory.
"""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from social_schemas import (
    ConnectMetaAccountRequest,
    PublishRequest,
    PublishResponse,
    SocialAccountOut,
    SocialPostOut,
)
from social_service import (
    post_facebook_video,
    post_instagram_video,
    MetaAPIError,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_supabase():
    # Replace with your actual Supabase service-role client
    raise NotImplementedError("Wire up your Supabase client here")


def current_user_id() -> str:
    # Replace with your actual auth dependency
    raise NotImplementedError("Wire up your auth dependency here")


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

@router.post("/accounts", response_model=SocialAccountOut, status_code=201)
async def connect_account(
    payload: ConnectMetaAccountRequest,
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    result = (
        db.table("social_accounts")
        .upsert(
            {
                "user_id": user_id,
                "provider": "meta",
                "facebook_page_id": payload.facebook_page_id,
                "facebook_page_name": payload.facebook_page_name,
                "page_access_token": payload.page_access_token,
                "instagram_user_id": payload.instagram_user_id,
                "instagram_username": payload.instagram_username,
                "token_expires_at": payload.token_expires_at.isoformat() if payload.token_expires_at else None,
                "is_active": True,
            },
            on_conflict="user_id,provider,facebook_page_id",
        )
        .execute()
    )
    return result.data[0]


@router.get("/accounts", response_model=list[SocialAccountOut])
def list_accounts(
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    result = (
        db.table("social_accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    return result.data


@router.delete("/accounts/{account_id}", status_code=204)
def disconnect_account(
    account_id: str,
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    db.table("social_accounts").update({"is_active": False}).eq("id", account_id).eq("user_id", user_id).execute()


# ---------------------------------------------------------------------------
# Publishing
# ---------------------------------------------------------------------------

@router.post("/publish", response_model=PublishResponse, status_code=202)
async def publish_video(
    payload: PublishRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    # Fetch the connected account
    account_result = (
        db.table("social_accounts")
        .select("*")
        .eq("id", payload.social_account_id)
        .eq("user_id", user_id)
        .eq("is_active", True)
        .single()
        .execute()
    )
    if not account_result.data:
        raise HTTPException(status_code=404, detail="Social account not found")
    account = account_result.data

    # Create pending post rows for each platform
    post_rows = []
    for platform in payload.platforms:
        if platform == "instagram" and not account.get("instagram_user_id"):
            raise HTTPException(
                status_code=422,
                detail="This account has no linked Instagram Business account",
            )
        row = (
            db.table("social_posts")
            .insert(
                {
                    "user_id": user_id,
                    "social_account_id": payload.social_account_id,
                    "video_job_id": payload.video_job_id,
                    "platform": platform,
                    "post_type": payload.post_type,
                    "status": "uploading",
                    "media_url": payload.media_url,
                    "caption": payload.caption,
                }
            )
            .execute()
        ).data[0]
        post_rows.append(row)

    # Kick off publishing in the background so we return 202 immediately
    background_tasks.add_task(
        _publish_all,
        account=account,
        post_rows=post_rows,
        payload=payload,
        db=db,
    )
    return {"posts": post_rows}


async def _publish_all(account: dict, post_rows: list, payload: PublishRequest, db):
    tasks = [
        _publish_one(account=account, post=post, payload=payload, db=db)
        for post in post_rows
    ]
    await asyncio.gather(*tasks, return_exceptions=True)


async def _publish_one(account: dict, post: dict, payload: PublishRequest, db):
    post_id = post["id"]
    platform = post["platform"]
    try:
        if platform == "facebook":
            external_id = await post_facebook_video(
                page_id=account["facebook_page_id"],
                access_token=account["page_access_token"],
                media_url=payload.media_url,
                caption=payload.caption,
            )
            db.table("social_posts").update(
                {"status": "published", "external_post_id": external_id, "posted_at": "now()"}
            ).eq("id", post_id).execute()

        elif platform == "instagram":
            container_id, media_id = await post_instagram_video(
                ig_user_id=account["instagram_user_id"],
                access_token=account["page_access_token"],
                media_url=payload.media_url,
                caption=payload.caption,
                is_reel=(payload.post_type == "reel"),
            )
            db.table("social_posts").update(
                {
                    "status": "published",
                    "container_id": container_id,
                    "external_post_id": media_id,
                    "posted_at": "now()",
                }
            ).eq("id", post_id).execute()

    except MetaAPIError as e:
        logger.error("Meta API error for post %s (%s): %s", post_id, platform, e)
        db.table("social_posts").update(
            {"status": "failed", "error_message": str(e)}
        ).eq("id", post_id).execute()
    except Exception as e:
        logger.exception("Unexpected error for post %s", post_id)
        db.table("social_posts").update(
            {"status": "failed", "error_message": "Unexpected error"}
        ).eq("id", post_id).execute()


# ---------------------------------------------------------------------------
# Posts list + status
# ---------------------------------------------------------------------------

@router.get("/posts", response_model=list[SocialPostOut])
def list_posts(
    video_job_id: str | None = None,
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    q = db.table("social_posts").select("*").eq("user_id", user_id)
    if video_job_id:
        q = q.eq("video_job_id", video_job_id)
    result = q.order("created_at", desc=True).limit(50).execute()
    return result.data


@router.get("/posts/{post_id}", response_model=SocialPostOut)
def get_post(
    post_id: str,
    user_id: str = Depends(current_user_id),
    db=Depends(get_supabase),
):
    result = (
        db.table("social_posts")
        .select("*")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return result.data
