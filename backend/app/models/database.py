from pathlib import Path

from app.database import Base, SessionLocal, database_url, engine


DATABASE_URL = database_url
DATABASE_PATH = Path(engine.url.database or ":memory:")
