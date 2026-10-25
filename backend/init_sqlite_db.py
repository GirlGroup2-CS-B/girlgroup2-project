from app.models.sqlite_database import DATABASE_PATH, engine
from app.models.sqlite_user import User


def init_db() -> None:
    User.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print(f"SQLite database initialized at {DATABASE_PATH}")
