import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.controllers import items
from app.database import SessionLocal
from app.main import app
from app.models import FoundItem, LostItem

PNG_IMAGE = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x04\x00\x00\x00\xb5\x1c\x0c\x02\x00\x00\x00\x0bIDATx\xdac\xf8"
    b"\xff\x1f\x00\x03\x03\x02\x00\xef\xbf\xe5\xfb\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)


class ItemUploadEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.upload_directory = Path(tempfile.mkdtemp())
        self.upload_directory_patch = patch.object(
            items,
            "UPLOAD_DIRECTORY",
            self.upload_directory,
        )
        self.upload_directory_patch.start()
        self.addCleanup(self.upload_directory_patch.stop)
        self.addCleanup(self._remove_upload_directory)

        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()
        self.addCleanup(self.client_context.__exit__, None, None, None)
        with SessionLocal() as db:
            db.execute(delete(LostItem))
            db.execute(delete(FoundItem))
            db.commit()

    def _remove_upload_directory(self) -> None:
        for uploaded_file in self.upload_directory.iterdir():
            uploaded_file.unlink()
        self.upload_directory.rmdir()

    def test_upload_saves_lost_item_and_image_path(self) -> None:
        reported = datetime(2026, 10, 24, 12, 30, tzinfo=timezone.utc)

        response = self.client.post(
            "/api/items/upload",
            data={
                "item_type": "lost",
                "title": "Blue water bottle",
                "description": "Left near the library",
                "location": "Library",
                "date_reported": reported.isoformat(),
            },
            files={"image": ("bottle.png", PNG_IMAGE, "image/png")},
        )

        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.assertEqual(payload["item_type"], "lost")
        self.assertEqual(payload["title"], "Blue water bottle")
        self.assertEqual(payload["image_path"].split("/")[0], "uploads")
        saved_image = self.upload_directory / Path(payload["image_path"]).name
        self.assertEqual(saved_image.read_bytes(), PNG_IMAGE)

        with SessionLocal() as db:
            item = db.scalar(select(LostItem))
            if item is None:
                self.fail("Lost item was not saved")
            self.assertEqual(item.image_path, payload["image_path"])
            self.assertEqual(item.location, "Library")
            self.assertIsNone(db.scalar(select(FoundItem)))

    def test_upload_saves_found_item_and_optional_form_fields(self) -> None:
        response = self.client.post(
            "/api/items/upload",
            data={
                "item_type": "found",
                "title": "Student ID",
                "description": "Found in the cafeteria",
                "location": "Cafeteria",
            },
            files={"image": ("id.png", PNG_IMAGE, "image/png")},
        )

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["item_type"], "found")
        self.assertIsNotNone(response.json()["date_reported"])
        with SessionLocal() as db:
            item = db.scalar(select(FoundItem))
            if item is None:
                self.fail("Found item was not saved")
            self.assertEqual(item.title, "Student ID")

    def test_upload_rejects_non_image_content(self) -> None:
        response = self.client.post(
            "/api/items/upload",
            data={
                "item_type": "lost",
                "title": "Blue water bottle",
                "description": "Left near the library",
                "location": "Library",
            },
            files={"image": ("image.png", b"not an image", "image/png")},
        )

        self.assertEqual(response.status_code, 415)
        self.assertEqual(list(self.upload_directory.iterdir()), [])
        with SessionLocal() as db:
            self.assertIsNone(db.scalar(select(LostItem)))

    def test_upload_rejects_images_over_10_mib(self) -> None:
        oversized_image = PNG_IMAGE + b"\x00" * (items.MAX_IMAGE_SIZE + 1 - len(PNG_IMAGE))

        response = self.client.post(
            "/api/items/upload",
            data={
                "item_type": "lost",
                "title": "Blue water bottle",
                "description": "Left near the library",
                "location": "Library",
            },
            files={"image": ("image.png", oversized_image, "image/png")},
        )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(list(self.upload_directory.iterdir()), [])

    def test_upload_rejects_unknown_item_type(self) -> None:
        response = self.client.post(
            "/api/items/upload",
            data={
                "item_type": "other",
                "title": "Blue water bottle",
                "description": "Left near the library",
                "location": "Library",
            },
            files={"image": ("image.png", PNG_IMAGE, "image/png")},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
