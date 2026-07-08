import io

import pytest

from app.api.v1.media import upload_image, UPLOAD_DIR
from fastapi import HTTPException, UploadFile


def _file(content: bytes, content_type: str, filename: str = "photo.jpg") -> UploadFile:
    from starlette.datastructures import Headers

    return UploadFile(file=io.BytesIO(content), filename=filename, headers=Headers({"content-type": content_type}))


@pytest.mark.asyncio
async def test_upload_saves_file_and_returns_url():
    result = await upload_image(_file(b"fake-jpeg-bytes", "image/jpeg"), user=None)
    assert result["url"].startswith("http")
    saved_name = result["url"].rsplit("/", 1)[-1]
    path = UPLOAD_DIR / saved_name
    assert path.exists()
    path.unlink()


@pytest.mark.asyncio
async def test_upload_rejects_disallowed_content_type():
    with pytest.raises(HTTPException) as exc:
        await upload_image(_file(b"not an image", "application/pdf"), user=None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file():
    with pytest.raises(HTTPException) as exc:
        await upload_image(_file(b"x" * (5 * 1024 * 1024 + 1), "image/png"), user=None)
    assert exc.value.status_code == 400
