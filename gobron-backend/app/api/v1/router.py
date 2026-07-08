"""Aggregate all v1 routers under one APIRouter."""
from fastapi import APIRouter

from app.api.v1 import admin, auth, bookings, fields, media, owner, slots, stats

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(fields.router)
api_router.include_router(media.router)
api_router.include_router(slots.router)
api_router.include_router(bookings.router)
api_router.include_router(stats.router)
api_router.include_router(owner.router)
api_router.include_router(admin.router)
