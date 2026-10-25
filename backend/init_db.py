from app.models import Base, DATABASE_PATH, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print(f"SQLite database initialized at {DATABASE_PATH}")
