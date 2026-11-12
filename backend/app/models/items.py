from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ItemFields:
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(255))
    date_reported: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    image_path: Mapped[str] = mapped_column(String(500))
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )


class LostItem(ItemFields, Base):
    __tablename__ = "lost_items"


class FoundItem(ItemFields, Base):
    __tablename__ = "found_items"
