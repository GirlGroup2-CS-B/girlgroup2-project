from fastapi import FastAPI

from .user import router as user_router

app = FastAPI()
app.include_router(user_router)


@app.get("/")
def root():
    return {"message": "FastAPI server is running"}