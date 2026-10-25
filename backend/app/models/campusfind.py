from datetime import date, datetime, time

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


SCHEMA = "user"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "(authentication_provider = 'email' AND password_hash IS NOT NULL) "
            "OR authentication_provider = 'google'",
            name="users_password_provider_check",
        ),
        CheckConstraint(
            "length(trim(full_name)) > 0", name="users_full_name_check"
        ),
        CheckConstraint(
            "authentication_provider IN ('email', 'google')",
            name="users_authentication_provider_check",
        ),
        CheckConstraint(
            "role IN ('student', 'reviewer', 'admin')", name="users_role_check"
        ),
        {"schema": SCHEMA},
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=False), primary_key=True
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    student_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text)
    authentication_provider: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'email'")
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'student'")
    )
    notification_preferences: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text(
            """'{"reports": true, "claims": true, "possible_matches": true}'::jsonb"""
        ),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("TRUE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ItemReport(Base):
    __tablename__ = "item_reports"
    __table_args__ = (
        CheckConstraint(
            "category IN ('Electronics', 'Identification Cards', "
            "'Bags and Wallets', 'School Supplies', 'Clothing', "
            "'Accessories', 'Keys', 'Other')",
            name="item_reports_category_check",
        ),
        CheckConstraint(
            "(report_type = 'LOST' AND listing_status IN "
            "('Lost', 'Pending Review', 'Approved Listing', 'Resolved', 'Withdrawn')) "
            "OR (report_type = 'FOUND' AND listing_status IN "
            "('Found', 'Pending Review', 'Approved Listing', 'Resolved', 'Withdrawn'))",
            name="item_report_status_type_check",
        ),
        CheckConstraint(
            "report_type IN ('LOST', 'FOUND')",
            name="item_reports_report_type_check",
        ),
        CheckConstraint("length(trim(item_name)) > 0", name="item_name_check"),
        {"schema": SCHEMA},
    )

    report_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=False), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    item_name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    report_type: Mapped[str] = mapped_column(String(10), nullable=False)
    image_path: Mapped[str | None] = mapped_column(Text)
    date_lost_or_found: Mapped[date] = mapped_column(Date, nullable=False)
    approximate_time: Mapped[time | None] = mapped_column(Time)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    additional_details: Mapped[str | None] = mapped_column(Text)
    contact_preference: Mapped[str | None] = mapped_column(String(100))
    custody_information: Mapped[str | None] = mapped_column(Text)
    listing_status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'Pending Review'")
    )
    extra_data: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (
        UniqueConstraint(
            "item_id", "claimant_user_id", name="claims_one_per_user_item"
        ),
        CheckConstraint(
            "claim_status IN ('Pending', 'Approved', 'Rejected')",
            name="claims_claim_status_check",
        ),
        CheckConstraint(
            "(claim_status = 'Pending' AND reviewed_at IS NULL) "
            "OR (claim_status IN ('Approved', 'Rejected') AND reviewed_at IS NOT NULL)",
            name="claims_review_consistency",
        ),
        {"schema": SCHEMA},
    )

    claim_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=False), primary_key=True
    )
    claim_reference: Mapped[str | None] = mapped_column(String(40), unique=True)
    item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.item_reports.report_id", ondelete="RESTRICT"),
        nullable=False,
    )
    claimant_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    distinctive_item_details: Mapped[str] = mapped_column(Text, nullable=False)
    approximate_date_lost: Mapped[date | None] = mapped_column(Date)
    approximate_location_lost: Mapped[str | None] = mapped_column(String(255))
    supporting_evidence_path: Mapped[str | None] = mapped_column(Text)
    contact_preference: Mapped[str | None] = mapped_column(String(100))
    claim_status: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default=text("'Pending'")
    )
    reviewer_notes: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.users.user_id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "read_status = FALSE OR read_at IS NOT NULL",
            name="notification_read_time_check",
        ),
        {"schema": SCHEMA},
    )

    notification_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=False), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    read_status: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("FALSE")
    )
    related_report_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.item_reports.report_id", ondelete="SET NULL"),
    )
    related_claim_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.claims.claim_id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ImageSearch(Base):
    __tablename__ = "image_searches"
    __table_args__ = (
        CheckConstraint(
            "search_status IN ('Submitted', 'Processing', 'Completed', 'Failed', 'Demo')",
            name="image_searches_search_status_check",
        ),
        {"schema": SCHEMA},
    )

    image_search_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=False), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    query_image_path: Mapped[str] = mapped_column(Text, nullable=False)
    search_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'Submitted'")
    )
    service_name: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result_metadata: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )


class ImageSearchMatch(Base):
    __tablename__ = "image_search_matches"
    __table_args__ = (
        CheckConstraint(
            "similarity_score IS NULL OR similarity_score BETWEEN 0 AND 1",
            name="image_search_matches_similarity_score_check",
        ),
        CheckConstraint(
            "result_rank IS NULL OR result_rank > 0",
            name="image_search_matches_result_rank_check",
        ),
        {"schema": SCHEMA},
    )

    image_search_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.image_searches.image_search_id", ondelete="CASCADE"),
        primary_key=True,
    )
    report_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.item_reports.report_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    similarity_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    result_rank: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
