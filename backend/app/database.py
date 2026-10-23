import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


database_url = os.getenv(
    "DATABASE_URL",
    URL.create(
        "sqlite",
        database=str(Path(__file__).resolve().parents[1] / "users.db"),
    ).render_as_string(hide_password=False),
)
engine_options: dict[str, object] = {}
if database_url.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
    if database_url in ("sqlite://", "sqlite:///:memory:"):
        engine_options["poolclass"] = StaticPool

engine = create_engine(database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
