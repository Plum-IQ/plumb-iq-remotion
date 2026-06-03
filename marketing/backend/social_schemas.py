from pydantic import BaseModel, HttpUrl
from typing import Optional, Literal
from datetime import datetime


class SocialAccountOut(BaseModel):
    id: str
    provider: str
    facebook_page_id: Optional[str]
    facebook_page_name: Optional[str]
    instagram_user_id: Optional[str]
    instagram_username: Optional[str]
    is_active: bool
    token_expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectMetaAccountRequest(BaseModel):
    page_access_token: str
    facebook_page_id: str
    facebook_page_name: str
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class PublishRequest(BaseModel):
    social_account_id: str
    video_job_id: str
    media_url: str           # publicly accessible URL of the rendered video
    caption: str
    platforms: list[Literal["facebook", "instagram"]]
    post_type: Literal["video", "reel"] = "video"


class SocialPostOut(BaseModel):
    id: str
    platform: str
    post_type: Optional[str]
    status: str
    external_post_id: Optional[str]
    container_id: Optional[str]
    media_url: Optional[str]
    caption: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    posted_at: Optional[datetime]

    class Config:
        from_attributes = True


class PublishResponse(BaseModel):
    posts: list[SocialPostOut]
