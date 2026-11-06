from contextlib import asynccontextmanager

from fastapi import FastAPI

import app.api_models  # noqa: F401
from app.controllers.auth import router as auth_router
from app.controllers.items import router as items_router
from app.database import Base, engine
from .user import router as user_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(items_router)
app.include_router(user_router)


@app.get("/")
def root():
    return {"message": "FastAPI server is running"}