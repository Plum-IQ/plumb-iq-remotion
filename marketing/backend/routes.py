from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from models import Lead, LeadStage
from schemas import LeadCreate, LeadUpdate, LeadOut, LeadListResponse, PipelineResponse
from scoring import calculate_score
from notifications import notify_new_lead, notify_stage_change

# ---------------------------------------------------------------------------
# Mount this router in your main FastAPI app:
#
#   from marketing.routes import router as leads_router
#   app.include_router(leads_router, prefix="/leads", tags=["leads"])
# ---------------------------------------------------------------------------

router = APIRouter()


def get_db():
    # Replace with your actual database session dependency
    raise NotImplementedError("Wire up your DB session here")


@router.post("/", response_model=LeadOut, status_code=201)
async def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    lead.score = calculate_score(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    await notify_new_lead(lead)
    return lead


@router.get("/", response_model=LeadListResponse)
def list_leads(
    stage: Optional[LeadStage] = None,
    source: Optional[str] = None,
    min_score: Optional[int] = Query(None, ge=0, le=100),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if stage:
        q = q.filter(Lead.stage == stage)
    if source:
        q = q.filter(Lead.source == source)
    if min_score is not None:
        q = q.filter(Lead.score >= min_score)
    if search:
        term = f"%{search}%"
        q = q.filter(
            Lead.name.ilike(term)
            | Lead.email.ilike(term)
            | Lead.company.ilike(term)
        )
    total = q.count()
    leads = q.order_by(Lead.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"leads": leads, "total": total, "page": page, "per_page": per_page}


@router.get("/pipeline", response_model=PipelineResponse)
def get_pipeline(db: Session = Depends(get_db)):
    all_leads = db.query(Lead).order_by(Lead.score.desc()).all()
    grouped: dict = {s.value: [] for s in LeadStage}
    for lead in all_leads:
        grouped[lead.stage].append(lead)
    return grouped


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: str, payload: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.stage
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    lead.score = calculate_score(lead)
    db.commit()
    db.refresh(lead)

    if payload.stage and payload.stage != old_stage:
        await notify_stage_change(lead, old_stage)

    return lead


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
