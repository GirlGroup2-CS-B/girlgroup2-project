import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-with-at-least-32-bytes"
os.environ["FRONTEND_ORIGINS"] = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8081,http://127.0.0.1:8081"
)

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, delete, select, text

from app.database import SessionLocal
from app.main import app, ensure_user_role_column
from app.models import User


class AuthEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()
        self.addCleanup(self.client_context.__exit__, None, None, None)
        with SessionLocal() as db:
            db.execute(delete(User))
            db.commit()

    def test_register_creates_user_without_returning_password(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "email": "  Person@Example.com ",
                "password": "safe-password",
                "role": "admin",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")
        self.assertEqual(response.json()["role"], "user")
        self.assertNotIn("password", response.json())
        with SessionLocal() as db:
            user = db.scalar(select(User))
            if user is None:
                self.fail("Registered user was not saved")
            self.assertNotEqual(user.password_hash, "safe-password")

    def test_register_accepts_url_encoded_form_data(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            data={"email": "person@example.com", "password": "safe-password"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")

    def test_register_rejects_duplicate_email(self) -> None:
        payload = {"email": "person@example.com", "password": "safe-password"}
        self.client.post("/api/auth/register", json=payload)

        response = self.client.post("/api/auth/register", json=payload)

        self.assertEqual(response.status_code, 409)

    def test_login_returns_a_valid_token_for_correct_credentials(self) -> None:
        payload = {"email": "person@example.com", "password": "safe-password"}
        self.client.post("/api/auth/register", json=payload)

        response = self.client.post("/api/auth/login", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["token_type"], "bearer")
        self.assertEqual(response.json()["role"], "user")
        claims = jwt.decode(
            response.json()["access_token"],
            os.environ["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
        self.assertEqual(claims["sub"], "1")
        self.assertEqual(claims["role"], "user")
        self.assertIn("exp", claims)

    def test_login_returns_the_backend_assigned_admin_role(self) -> None:
        payload = {"email": "admin@example.com", "password": "safe-password"}
        self.client.post("/api/auth/register", json=payload)
        with SessionLocal() as db:
            admin = db.scalar(select(User).where(User.email == payload["email"]))
            if admin is None:
                self.fail("Registered account was not saved")
            admin.role = "admin"
            db.commit()

        response = self.client.post("/api/auth/login", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "admin")
        claims = jwt.decode(
            response.json()["access_token"],
            os.environ["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
        self.assertEqual(claims["role"], "admin")

    def test_existing_database_accounts_receive_user_role(self) -> None:
        legacy_engine = create_engine("sqlite://")
        self.addCleanup(legacy_engine.dispose)
        with legacy_engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TABLE users ("
                "id INTEGER PRIMARY KEY, "
                "email VARCHAR(254) NOT NULL, "
                "password_hash VARCHAR(255) NOT NULL)"
            )
            connection.exec_driver_sql(
                "INSERT INTO users (id, email, password_hash) "
                "VALUES (1, 'existing@example.com', 'hash')"
            )

        ensure_user_role_column(legacy_engine)

        with legacy_engine.connect() as connection:
            role = connection.scalar(
                text("SELECT role FROM users WHERE id = 1")
            )
        self.assertEqual(role, "user")

    def test_login_accepts_url_encoded_form_data(self) -> None:
        payload = {"email": "person@example.com", "password": "safe-password"}
        self.client.post("/api/auth/register", json=payload)

        response = self.client.post("/api/auth/login", data=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["token_type"], "bearer")
        self.assertTrue(response.json()["access_token"])

    def test_login_rejects_incorrect_password(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={"email": "person@example.com", "password": "safe-password"},
        )

        response = self.client.post(
            "/api/auth/login",
            json={"email": "person@example.com", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)

    def test_register_validates_email_and_password(self) -> None:
        invalid_email = self.client.post(
            "/api/auth/register",
            json={"email": "invalid", "password": "safe-password"},
        )
        short_password = self.client.post(
            "/api/auth/register",
            json={"email": "person@example.com", "password": "short"},
        )

        self.assertEqual(invalid_email.status_code, 422)
        self.assertEqual(short_password.status_code, 422)

    def test_auth_endpoints_reject_unsupported_media_types(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            content="email=person%40example.com&password=safe-password",
            headers={"Content-Type": "text/plain"},
        )

        self.assertEqual(response.status_code, 415)

    def test_openapi_documents_json_and_form_request_bodies(self) -> None:
        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        content = response.json()["paths"]["/api/auth/register"]["post"]["requestBody"]["content"]
        self.assertIn("application/json", content)
        self.assertIn("application/x-www-form-urlencoded", content)

    def test_auth_endpoint_allows_configured_web_frontend_origin(self) -> None:
        response = self.client.options(
            "/api/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "http://localhost:5173",
        )

        blocked_response = self.client.options(
            "/api/auth/login",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "POST",
            },
        )

        self.assertNotIn("access-control-allow-origin", blocked_response.headers)


if __name__ == "__main__":
    unittest.main()
