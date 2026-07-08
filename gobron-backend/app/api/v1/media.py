"""Media upload — owner/admin image uploads, served back as static URLs."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import require_role
from app.models.enums import UserRole

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    user=Depends(require_role(UserRole.FIELD_OWNER, UserRole.SUPERADMIN)),
):
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Faqat JPEG, PNG yoki WEBP rasm")

    body = await file.read()
    if len(body) > _MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rasm hajmi 5MB dan oshmasligi kerak")

    ext = Path(file.filename or "").suffix or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(body)

    return {"url": f"{settings.PUBLIC_BASE_URL}/uploads/{name}"}
