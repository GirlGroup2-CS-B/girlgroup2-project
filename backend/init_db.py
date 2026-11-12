from app.models import DATABASE_PATH, init_db


if __name__ == "__main__":
    init_db()
    if DATABASE_PATH is None:
        print("Database initialized.")
    else:
        print(f"SQLite database initialized at {DATABASE_PATH}")
