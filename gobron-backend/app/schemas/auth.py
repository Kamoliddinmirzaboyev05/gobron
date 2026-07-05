"""Auth request/response schemas."""
from pydantic import BaseModel, Field


class OTPRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20, examples=["+998901234567"])


class OTPVerify(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    code: str = Field(..., min_length=4, max_length=8)
    full_name: str | None = Field(None, max_length=120)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
