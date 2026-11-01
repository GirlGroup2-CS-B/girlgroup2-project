import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from app import models  # noqa: F401
from app.controllers.auth import router as auth_router
from app.controllers.items import UPLOAD_DIRECTORY, router as items_router
from app.database import Base, engine

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:8081,http://127.0.0.1:8081",
    ).split(",")
    if origin.strip()
]


def ensure_user_role_column(database_engine: Engine = engine) -> None:
    inspector = inspect(database_engine)
    if not inspector.has_table("users"):
        return
    if "role" in {column["name"] for column in inspector.get_columns("users")}:
        return

    with database_engine.begin() as connection:
        connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN role VARCHAR(16) "
            "NOT NULL DEFAULT 'user'"
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_user_role_column()
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(auth_router)
app.include_router(items_router)

UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")


@app.get("/")
def root():
    return {"message": "FastAPI server is running"}