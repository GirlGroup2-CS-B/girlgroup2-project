from datetime import date, datetime, time

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ItemFields:
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(255))
    date_reported: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    image_path: Mapped[str] = mapped_column(String(500))


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'admin')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="user",
        server_default=text("'user'"),
    )


class LostItem(ItemFields, Base):
    __tablename__ = "lost_items"


class FoundItem(ItemFields, Base):
    __tablename__ = "found_items"


class ItemReport(Base):
    __tablename__ = "item_reports"

    report_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    item_name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    report_type: Mapped[str] = mapped_column(String(10))  # 'LOST' or 'FOUND'
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date_lost_or_found: Mapped[date] = mapped_column(Date)
    approximate_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    location: Mapped[str] = mapped_column(String(255))
    additional_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_preference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    custody_information: Mapped[str | None] = mapped_column(Text, nullable=True)
    listing_status: Mapped[str] = mapped_column(String(30), default="Pending Review")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(),
    )
