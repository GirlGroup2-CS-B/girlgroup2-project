import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "Set DATABASE_URL to your PostgreSQL connection string before starting the backend."
    )
if not DATABASE_URL.startswith(("postgresql://", "postgresql+psycopg2://")):
    raise ValueError("DATABASE_URL must use PostgreSQL.")

engine = create_engine(
    DATABASE_URL,
    connect_args={"options": "-csearch_path=lostfound,public"},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass
