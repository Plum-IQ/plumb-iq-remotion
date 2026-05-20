from enum import Enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum as SAEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class LeadStage(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"


class LeadSource(str, Enum):
    ORGANIC = "organic"
    REFERRAL = "referral"
    DIRECT = "direct"
    SOCIAL = "social"
    PAID = "paid"
    OTHER = "other"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    source = Column(SAEnum(LeadSource), default=LeadSource.OTHER)
    stage = Column(SAEnum(LeadStage), default=LeadStage.NEW)
    score = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)          # comma-separated
    form_id = Column(String, nullable=True)        # which capture form submitted
    referrer_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
