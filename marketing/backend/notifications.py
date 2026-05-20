import httpx
import os
import logging
from models import Lead

logger = logging.getLogger(__name__)

# Set LEAD_NOTIFICATION_WEBHOOK_URL in your environment to receive new-lead payloads
WEBHOOK_URL = os.getenv("LEAD_NOTIFICATION_WEBHOOK_URL")


async def notify_new_lead(lead: Lead) -> None:
    if not WEBHOOK_URL:
        return
    payload = {
        "event": "lead.created",
        "lead": {
            "id": lead.id,
            "name": lead.name,
            "email": lead.email,
            "phone": lead.phone,
            "company": lead.company,
            "source": lead.source,
            "score": lead.score,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning("Lead notification webhook failed: %s", e)


async def notify_stage_change(lead: Lead, old_stage: str) -> None:
    if not WEBHOOK_URL:
        return
    payload = {
        "event": "lead.stage_changed",
        "lead_id": lead.id,
        "from_stage": old_stage,
        "to_stage": lead.stage,
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning("Stage-change notification webhook failed: %s", e)
