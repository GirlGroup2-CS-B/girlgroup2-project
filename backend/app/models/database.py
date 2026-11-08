from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_PATH = Path(__file__).resolve().parents[3] / "Database" / "backend_users.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from .item import FoundItem, LostItem
    from .user import User

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    for table_name in (LostItem.__tablename__, FoundItem.__tablename__):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "is_deleted" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        "ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0"
                    )
                )
