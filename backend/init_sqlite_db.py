import app.models.item_report as _item_report_models
import app.models.sqlite_user as _sqlite_user_models
from app.models.sqlite_database import Base, DATABASE_PATH, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print(f"SQLite database initialized at {DATABASE_PATH}")
