from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401
from app.controllers.auth import router as auth_router
from app.controllers.items import router as items_router
from app.database import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(items_router)


@app.get("/")
def root():
    return {"message": "FastAPI server is running"}