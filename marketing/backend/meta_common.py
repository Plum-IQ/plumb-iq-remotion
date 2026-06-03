"""
meta_common.py — shared helpers for Facebook and Instagram posting.

Provides the constants and Supabase-backed functions that meta_facebook.py
and meta_instagram.py both import.

Env:  SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

from datetime import datetime, timezone
import os

import httpx
from fastapi import HTTPException
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

BASE = "https://graph.facebook.com/v20.0"


def _db() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# HTTP response handler
# ---------------------------------------------------------------------------

def handle(resp: httpx.Response) -> dict:
    """Raise HTTPException on non-2xx or Meta error body; otherwise return parsed JSON."""
    try:
        body = resp.json()
    except Exception:
        resp.raise_for_status()
        return {}

    if "error" in body:
        err = body["error"]
        msg = err.get("message", "Unknown Meta API error")
        code = err.get("code", resp.status_code)
        raise HTTPException(status_code=502, detail=f"Meta API {code}: {msg}")

    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Meta API returned {resp.status_code}")

    return body


# ---------------------------------------------------------------------------
# social_accounts helpers (single-account MVP)
# ---------------------------------------------------------------------------

async def get_account() -> dict:
    """Return the single active Meta account row, or raise 404."""
    result = (
        _db()
        .table("social_accounts")
        .select("*")
        .eq("provider", "meta")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="No active Meta account connected. Visit /social/connect to link a Facebook Page.",
        )
    return result.data[0]


# ---------------------------------------------------------------------------
# social_posts helpers
# ---------------------------------------------------------------------------

async def create_post(data: dict) -> dict:
    result = _db().table("social_posts").insert(data).execute()
    return result.data[0]


async def update_post(post_id: str, **kwargs) -> dict:
    result = (
        _db()
        .table("social_posts")
        .update(kwargs)
        .eq("id", post_id)
        .execute()
    )
    return result.data[0]


async def get_post(post_id: str) -> dict:
    result = (
        _db()
        .table("social_posts")
        .select("*")
        .eq("id", post_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Social post not found")
    return result.data
