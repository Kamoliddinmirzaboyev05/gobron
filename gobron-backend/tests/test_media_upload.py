import io

import pytest
from PIL import Image

from app.api.v1.media import upload_image, UPLOAD_DIR, _MAX_DIMENSION
from fastapi import HTTPException, UploadFile


def _file(content: bytes, content_type: str, filename: str = "photo.jpg") -> UploadFile:
    from starlette.datastructures import Headers

    return UploadFile(file=io.BytesIO(content), filename=filename, headers=Headers({"content-type": content_type}))


def _real_image_bytes(fmt: str, size: tuple[int, int] = (10, 10)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color="green").save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_upload_saves_file_and_returns_url():
    result = await upload_image(_file(_real_image_bytes("JPEG"), "image/jpeg"), user=None)
    assert result["url"].startswith("http")
    assert result["url"].endswith(".jpg")
    saved_name = result["url"].rsplit("/", 1)[-1]
    path = UPLOAD_DIR / saved_name
    assert path.exists()
    path.unlink()


@pytest.mark.asyncio
async def test_upload_accepts_heic_and_reencodes_to_jpeg():
    # HEIC content-type but real PNG bytes - only the re-encode step is under
    # test here (real HEIC bytes require a pillow-heif fixture image); the
    # content-type gate + JPEG re-encode is what actually fixes the iPhone bug.
    result = await upload_image(_file(_real_image_bytes("PNG"), "image/heic"), user=None)
    saved_name = result["url"].rsplit("/", 1)[-1]
    path = UPLOAD_DIR / saved_name
    assert path.suffix == ".jpg"
    with Image.open(path) as saved:
        assert saved.format == "JPEG"
    path.unlink()


@pytest.mark.asyncio
async def test_upload_downsizes_large_images():
    result = await upload_image(
        _file(_real_image_bytes("JPEG", size=(3000, 2000)), "image/jpeg"), user=None
    )
    saved_name = result["url"].rsplit("/", 1)[-1]
    path = UPLOAD_DIR / saved_name
    with Image.open(path) as saved:
        assert max(saved.size) <= _MAX_DIMENSION
    path.unlink()


@pytest.mark.asyncio
async def test_upload_rejects_disallowed_content_type():
    with pytest.raises(HTTPException) as exc:
        await upload_image(_file(b"not an image", "application/pdf"), user=None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_corrupt_bytes_of_allowed_type():
    with pytest.raises(HTTPException) as exc:
        await upload_image(_file(b"not actually a jpeg", "image/jpeg"), user=None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file():
    with pytest.raises(HTTPException) as exc:
        await upload_image(_file(b"x" * (20 * 1024 * 1024 + 1), "image/png"), user=None)
    assert exc.value.status_code == 400
