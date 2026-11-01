from datetime import UTC, date, datetime
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FoundItem, ItemReport, LostItem, User

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

DEFAULT_SAMPLE_ITEMS = [
    {
        "id": "sample-1",
        "type": "lost",
        "name": "Navy blue backpack",
        "category": "Bags",
        "location": "Library, 2nd floor",
        "date": "2026-10-25",
        "description": "A navy backpack with a small yellow keychain. It may have been left near the study tables.",
        "reporter": "Development sample",
        "icon": "🎒",
        "status": "Possible match",
        "reviewStatus": "Approved",
    },
    {
        "id": "sample-2",
        "type": "found",
        "name": "Blue backpack",
        "category": "Bags",
        "location": "Main Library",
        "date": "2026-10-26",
        "description": "Found beside a study table on the second floor. A yellow keychain is attached.",
        "reporter": "Development sample",
        "icon": "🎒",
        "status": "Possible match",
        "reviewStatus": "Approved",
    },
    {
        "id": "sample-3",
        "type": "lost",
        "name": "Student ID card",
        "category": "Documents",
        "location": "Science Building",
        "date": "2026-10-24",
        "description": "Student ID in a clear sleeve. Please verify the name when claiming.",
        "reporter": "Development sample",
        "icon": "🪪",
        "status": "Open",
        "reviewStatus": "Approved",
    },
    {
        "id": "sample-4",
        "type": "found",
        "name": "Silver water bottle",
        "category": "Accessories",
        "location": "Student Center",
        "date": "2026-10-26",
        "description": "Reusable silver bottle found near the east entrance.",
        "reporter": "Development sample",
        "icon": "🧴",
        "status": "Open",
        "reviewStatus": "Approved",
    },
    {
        "id": "sample-5",
        "type": "lost",
        "name": "Wireless earbuds case",
        "category": "Electronics",
        "location": "Engineering Hall",
        "date": "2026-10-22",
        "description": "Small white charging case, no earbuds inside.",
        "reporter": "Development sample",
        "icon": "🎧",
        "status": "Open",
        "reviewStatus": "Approved",
    },
    {
        "id": "sample-6",
        "type": "found",
        "name": "Set of keys",
        "category": "Personal items",
        "location": "Campus Garden",
        "date": "2026-10-21",
        "description": "Three keys on a green fabric key ring.",
        "reporter": "Development sample",
        "icon": "🔑",
        "status": "Open",
        "reviewStatus": "Approved",
    },
]


class ItemUploadResponse(BaseModel):
    id: int
    item_type: Literal["lost", "found"]
    user_id: int | None
    title: str
    description: str
    location: str
    date_reported: datetime
    image_path: str


class CampusItemSchema(BaseModel):
    id: str
    type: Literal["lost", "found"]
    name: str
    category: str
    location: str
    date: str
    description: str
    reporter: str
    icon: str
    status: Literal["Open", "Possible match", "Returned"] = "Open"
    reviewStatus: Literal["Pending", "Approved", "Rejected"] = "Approved"
    image_path: Optional[str] = None


class CreateItemPayload(BaseModel):
    type: Literal["lost", "found"]
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="Other", max_length=80)
    location: str = Field(..., min_length=1, max_length=255)
    date: str = Field(..., min_length=4)
    description: str = Field(..., min_length=1, max_length=5000)
    icon: Optional[str] = "📦"
    reporter: Optional[str] = "Student"


@router.get("", response_model=list[CampusItemSchema])
def list_items(
    type: Optional[Literal["lost", "found"]] = None,
    db: Session = Depends(get_db),
) -> list[CampusItemSchema]:
    results: list[CampusItemSchema] = []

    # Fetch from lost_items and found_items
    lost_items = db.scalars(select(LostItem).order_by(LostItem.id.desc())).all()
    found_items = db.scalars(select(FoundItem).order_by(FoundItem.id.desc())).all()

    for item in lost_items:
        date_str = (
            item.date_reported.strftime("%Y-%m-%d")
            if item.date_reported
            else "2026-10-31"
        )
        results.append(
            CampusItemSchema(
                id=f"lost-{item.id}",
                type="lost",
                name=item.title,
                category="General",
                location=item.location,
                date=date_str,
                description=item.description,
                reporter=f"User #{item.user_id}" if item.user_id else "Community report",
                icon="🎒",
                status="Open",
                reviewStatus="Approved",
                image_path=item.image_path,
            )
        )

    for item in found_items:
        date_str = (
            item.date_reported.strftime("%Y-%m-%d")
            if item.date_reported
            else "2026-10-31"
        )
        results.append(
            CampusItemSchema(
                id=f"found-{item.id}",
                type="found",
                name=item.title,
                category="General",
                location=item.location,
                date=date_str,
                description=item.description,
                reporter=f"User #{item.user_id}" if item.user_id else "Community report",
                icon="✓",
                status="Open",
                reviewStatus="Approved",
                image_path=item.image_path,
            )
        )

    # Fetch from item_reports if any exist
    try:
        item_reports = db.scalars(
            select(ItemReport).order_by(ItemReport.report_id.desc())
        ).all()
        for report in item_reports:
            r_type = "lost" if report.report_type.upper() == "LOST" else "found"
            date_str = str(report.date_lost_or_found)
            results.append(
                CampusItemSchema(
                    id=f"report-{report.report_id}",
                    type=r_type,
                    name=report.item_name,
                    category=report.category,
                    location=report.location,
                    date=date_str,
                    description=report.description,
                    reporter=f"User #{report.user_id}" if report.user_id else "Campus Member",
                    icon="🎒" if r_type == "lost" else "📦",
                    status="Open",
                    reviewStatus="Approved",
                    image_path=report.image_path,
                )
            )
    except Exception:
        pass

    # Include default sample items so dashboard is never empty
    for sample in DEFAULT_SAMPLE_ITEMS:
        results.append(CampusItemSchema.model_validate(sample))

    if type:
        results = [item for item in results if item.type == type]

    return results


@router.post("", response_model=CampusItemSchema, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: CreateItemPayload,
    db: Session = Depends(get_db),
) -> CampusItemSchema:
    name = payload.name.strip()
    description = payload.description.strip()
    location = payload.location.strip()
    if not name or not description or not location:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name, description, and location must not be blank",
        )

    try:
        parsed_date = date.fromisoformat(payload.date)
    except ValueError:
        parsed_date = date.today()

    dt = datetime.combine(parsed_date, datetime.min.time(), tzinfo=UTC)

    # Save to LostItem / FoundItem
    item_model = LostItem if payload.type == "lost" else FoundItem
    item = item_model(
        user_id=None,
        title=name,
        description=description,
        location=location,
        date_reported=dt,
        image_path="",
    )
    db.add(item)

    # Also save to ItemReport for database schema compatibility
    try:
        report = ItemReport(
            user_id=None,
            item_name=name,
            category=payload.category,
            description=description,
            report_type="LOST" if payload.type == "lost" else "FOUND",
            image_path=None,
            date_lost_or_found=parsed_date,
            location=location,
            listing_status="Pending Review",
        )
        db.add(report)
    except Exception:
        pass

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save item",
        ) from error

    return CampusItemSchema(
        id=f"{payload.type}-{item.id}",
        type=payload.type,
        name=name,
        category=payload.category,
        location=location,
        date=payload.date,
        description=description,
        reporter=payload.reporter or "Student",
        icon=payload.icon or "📦",
        status="Open",
        reviewStatus="Pending",
    )


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
