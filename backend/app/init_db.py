"""Database initialization script for CampusFind backend.

Supports:
1. Executing Database-sql.sql on PostgreSQL when DATABASE_URL is set to postgresql://...
2. Initializing SQLite tables with SQLAlchemy models and default admin/user accounts.
"""

import os
from pathlib import Path

from sqlalchemy import select, text

from app.database import Base, SessionLocal, database_url, engine
from app.models import ItemReport, LostItem, FoundItem, User
from app.services.auth import hash_password


def run_sql_file_if_postgres():
    sql_file = Path(__file__).resolve().parents[1] / "sql" / "Database-sql.sql"
    if not sql_file.exists():
        sql_file = Path("c:/Users/Jane/Downloads/Database-sql.sql")

    if database_url.startswith("postgresql"):
        print("PostgreSQL database detected. Executing Database-sql.sql...")
        if sql_file.exists():
            content = sql_file.read_text(encoding="utf-8")
            with engine.begin() as conn:
                conn.execute(text(content))
            print("Successfully applied Database-sql.sql to PostgreSQL!")
        else:
            print(f"Warning: {sql_file} not found.")


def init_database():
    print(f"Initializing database at: {database_url}")
    if database_url.startswith("postgresql"):
        try:
            run_sql_file_if_postgres()
        except Exception as e:
            print(f"PostgreSQL raw script execution note: {e}")

    # Ensure all SQLAlchemy model tables exist
    Base.metadata.create_all(bind=engine)
    print("Database tables verified.")

    # Seed initial test/demo user accounts if empty
    with SessionLocal() as db:
        admin_user = db.scalar(select(User).where(User.email == "admin@campusfind.edu"))
        if not admin_user:
            admin_user = User(
                email="admin@campusfind.edu",
                password_hash=hash_password("admin1234"),
                role="admin",
            )
            db.add(admin_user)
            print("Created default admin user: admin@campusfind.edu / admin1234")

        test_user = db.scalar(select(User).where(User.email == "student@campusfind.edu"))
        if not test_user:
            test_user = User(
                email="student@campusfind.edu",
                password_hash=hash_password("student1234"),
                role="user",
            )
            db.add(test_user)
            print("Created default student user: student@campusfind.edu / student1234")

        db.commit()

    print("Database initialization complete.")


if __name__ == "__main__":
    init_database()
