from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from models import LeadStage, LeadSource


class LeadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    source: LeadSource = LeadSource.OTHER
    notes: Optional[str] = None
    tags: Optional[str] = None
    form_id: Optional[str] = None
    referrer_url: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[LeadSource] = None
    stage: Optional[LeadStage] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


class LeadOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    source: LeadSource
    stage: LeadStage
    score: int
    notes: Optional[str]
    tags: Optional[str]
    form_id: Optional[str]
    referrer_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    leads: List[LeadOut]
    total: int
    page: int
    per_page: int


class PipelineResponse(BaseModel):
    new: List[LeadOut]
    contacted: List[LeadOut]
    qualified: List[LeadOut]
    proposal: List[LeadOut]
    won: List[LeadOut]
    lost: List[LeadOut]
