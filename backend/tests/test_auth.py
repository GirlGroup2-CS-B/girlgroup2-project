import os
import unittest

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-with-at-least-32-bytes"

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import delete, select

from app.database import SessionLocal
from app.main import app
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
            json={"email": "  Person@Example.com ", "password": "safe-password"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["email"], "person@example.com")
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
        claims = jwt.decode(
            response.json()["access_token"],
            os.environ["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
        self.assertEqual(claims["sub"], "1")
        self.assertIn("exp", claims)

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


if __name__ == "__main__":
    unittest.main()
