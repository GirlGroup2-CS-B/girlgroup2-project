import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, URL
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


_DEFAULT_DATABASE_PATH = (
    Path(__file__).resolve().parents[3] / "Database" / "backend_users.db"
)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    URL.create(
        "sqlite",
        database=_DEFAULT_DATABASE_PATH.as_posix(),
    ).render_as_string(hide_password=False),
)
database_url = DATABASE_URL

engine_options: dict[str, object] = {}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
    if DATABASE_URL in ("sqlite://", "sqlite:///:memory:"):
        engine_options["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
DATABASE_PATH = (
    Path(engine.url.database)
    if engine.dialect.name == "sqlite" and engine.url.database
    else None
)


class Base(DeclarativeBase):
    pass


def ensure_item_soft_delete_columns(database_engine: Engine = engine) -> None:
    inspector = inspect(database_engine)
    for table_name in ("lost_items", "found_items"):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "is_deleted" not in columns:
            with database_engine.begin() as connection:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        "ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
                    )
                )


def init_db() -> None:
    from .item import FoundItem, LostItem
    from .user import User

    Base.metadata.create_all(bind=engine)
    ensure_item_soft_delete_columns(engine)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
