from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FoundItem, LostItem, User

router = APIRouter(prefix="/api/items", tags=["items"])

UPLOAD_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads"
MAX_IMAGE_SIZE = 10 * 1024 * 1024
IMAGE_FORMATS = {
    "image/jpeg": (".jpg", lambda content: content.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda content: content.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/gif": (".gif", lambda content: content.startswith((b"GIF87a", b"GIF89a"))),
    "image/webp": (
        ".webp",
        lambda content: len(content) >= 12
        and content[:4] == b"RIFF"
        and content[8:12] == b"WEBP",
    ),
}


class ItemUploadResponse(BaseModel):
    id: int
    item_type: Literal["lost", "found"]
    user_id: int | None
    title: str
    description: str
    location: str
    date_reported: datetime
    image_path: str


@router.post(
    "/upload",
    response_model=ItemUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_item(
    item_type: Literal["lost", "found"] = Form(...),
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=5000),
    location: str = Form(..., min_length=1, max_length=255),
    date_reported: datetime | None = Form(None),
    user_id: int | None = Form(None, gt=0),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ItemUploadResponse:
    title = title.strip()
    description = description.strip()
    location = location.strip()
    if not title or not description or not location:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title, description, and location must not be blank",
        )

    if user_id is not None and db.get(User, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    image_format = IMAGE_FORMATS.get(image.content_type or "")
    if image_format is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Image must be JPEG, PNG, GIF, or WebP",
        )

    image_bytes = image.file.read(MAX_IMAGE_SIZE + 1)
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Image must not exceed 10 MiB",
        )

    extension, matches_signature = image_format
    if not matches_signature(image_bytes):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Uploaded file content does not match its image media type",
        )

    try:
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}{extension}"
        destination = UPLOAD_DIRECTORY / filename
        destination.write_bytes(image_bytes)
    except OSError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save uploaded image",
        ) from error

    image_path = f"uploads/{filename}"
    item_model = LostItem if item_type == "lost" else FoundItem
    item = item_model(
        user_id=user_id,
        title=title,
        description=description,
        location=location,
        date_reported=date_reported or datetime.now(UTC),
        image_path=image_path,
    )
    try:
        db.add(item)
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save uploaded item",
        ) from error

    return ItemUploadResponse(
        id=item.id,
        item_type=item_type,
        user_id=item.user_id,
        title=item.title,
        description=item.description,
        location=item.location,
        date_reported=item.date_reported,
        image_path=item.image_path,
    )
