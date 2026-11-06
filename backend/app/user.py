from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: str
    student_id: str = Field(..., min_length=1, max_length=50)
    role: str = Field(default="student")


class UserOut(UserCreate):
    user_id: int


users_db: List[UserOut] = [
    UserOut(
        user_id=1,
        full_name="Sample User",
        email="sample@school.edu",
        student_id="20240001",
        role="student",
    )
]


@router.get("/", response_model=List[UserOut])
def list_users() -> List[UserOut]:
    return users_db


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int) -> UserOut:
    for user in users_db:
        if user.user_id == user_id:
            return user
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User with id {user_id} not found",
    )


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate) -> UserOut:
    new_user = UserOut(
        user_id=len(users_db) + 1,
        full_name=user.full_name,
        email=user.email,
        student_id=user.student_id,
        role=user.role,
    )
    users_db.append(new_user)
    return new_user
