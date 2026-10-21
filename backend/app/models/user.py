from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from .database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "lostfound"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    student_id = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<User(id={self.id}, full_name='{self.full_name}', email='{self.email}')>"
