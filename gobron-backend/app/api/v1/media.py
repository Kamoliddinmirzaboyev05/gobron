"""Media upload — owner/admin image uploads, served back as static URLs.

Every upload is re-encoded to JPEG and downsized on the server. This is
what lets phone photos work at all: iPhones default to HEIC (which most
browsers can't display if served back as-is) and phone camera files
routinely exceed a flat byte cap - re-encoding sidesteps both at once.
"""
import io
import uuid
from pathlib import Path

import pillow_heif
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from PIL import Image

from app.core.config import settings
from app.core.deps import require_role
from app.models.enums import UserRole

pillow_heif.register_heif_opener()

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
_MAX_BYTES = 20 * 1024 * 1024  # 20 MB raw upload, before re-encoding
_MAX_DIMENSION = 1920


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    user=Depends(require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)),
):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Faqat JPEG, PNG, WEBP yoki HEIC rasm")

    body = await file.read()
    if len(body) > _MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rasm hajmi 20MB dan oshmasligi kerak")

    try:
        image = Image.open(io.BytesIO(body))
        image = image.convert("RGB")
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rasm fayli buzilgan yoki noto'g'ri format")

    image.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85, optimize=True)

    name = f"{uuid.uuid4().hex}.jpg"
    (UPLOAD_DIR / name).write_bytes(buffer.getvalue())

    return {"url": f"{settings.PUBLIC_BASE_URL}/uploads/{name}"}
