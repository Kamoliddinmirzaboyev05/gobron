"""Web Push subscription schema — mirrors the browser PushSubscription.toJSON() shape."""
from pydantic import BaseModel


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
