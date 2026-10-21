from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# PostgreSQL connection
DATABASE_URL = "postgresql://postgres:sa@localhost:5432/campusfind"

engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"options": "-csearch_path=lostfound,public"}
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()
