import json
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AuthRequest, TokenResponse, UserResponse
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["authentication"])

AUTH_REQUEST_SCHEMA = AuthRequest.model_json_schema()
AUTH_REQUEST_BODY = {
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {"schema": AUTH_REQUEST_SCHEMA},
            "application/x-www-form-urlencoded": {"schema": AUTH_REQUEST_SCHEMA},
        },
    }
}


async def parse_auth_request(request: Request) -> AuthRequest:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip()

    if content_type == "application/json" or content_type.endswith("+json"):
        try:
            payload = await request.json()
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Request body must contain valid JSON",
            ) from error
    elif content_type == "application/x-www-form-urlencoded":
        try:
            form_body = (await request.body()).decode("utf-8")
            payload = {
                key: values[-1]
                for key, values in parse_qs(
                    form_body,
                    keep_blank_values=True,
                    strict_parsing=True,
                ).items()
            }
        except (UnicodeDecodeError, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Form body must be valid URL-encoded UTF-8",
            ) from error
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Content-Type must be application/json or application/x-www-form-urlencoded",
        )

    try:
        return AuthRequest.model_validate(payload)
    except ValidationError as error:
        raise RequestValidationError(
            error.errors(include_context=False),
            body=payload,
        ) from error


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    openapi_extra=AUTH_REQUEST_BODY,
)
def register_user(
    credentials: AuthRequest = Depends(parse_auth_request),
    db: Session = Depends(get_db),
) -> User:
    existing_user = db.scalar(select(User).where(User.email == credentials.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=credentials.email,
        password_hash=hash_password(credentials.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from None

    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    openapi_extra=AUTH_REQUEST_BODY,
)
def login_user(
    credentials: AuthRequest = Depends(parse_auth_request),
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == credentials.email))
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(user.id))
