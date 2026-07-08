"""Auth request/response schemas."""
from pydantic import BaseModel, Field


class OTPRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20, examples=["+998901234567"])


class OTPVerify(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    code: str = Field(..., min_length=4, max_length=8)
    full_name: str | None = Field(None, max_length=120)


class PasswordLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)


class PhoneLogin(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    full_name: str | None = Field(None, min_length=2, max_length=120)
    # Set on registration (full_name present) and required to log back in
    # afterwards. Accounts created without a password (older phone-only
    # flow, e.g. flutter-admin) keep logging in without one.
    password: str | None = Field(None, min_length=6, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
