from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from .database import Base


class LostItem(Base):
    __tablename__ = "lost_items"
    __table_args__ = {"schema": "lostfound"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("lostfound.users.id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    date_reported = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
    image_path = Column(String(500), nullable=True)
