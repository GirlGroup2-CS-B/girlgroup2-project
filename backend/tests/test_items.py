import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, inspect, select, text

from app.controllers import items
from app import database
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

    def test_delete_marks_item_deleted_and_excludes_it_from_main_feed(self) -> None:
        with SessionLocal() as db:
            item = LostItem(
                title="Blue water bottle",
                description="Left near the library",
                location="Library",
                date_reported=datetime.now(timezone.utc),
                image_path="uploads/bottle.png",
            )
            db.add(item)
            db.commit()
            item_id = item.id

        response = self.client.delete(f"/api/items/lost/{item_id}")

        self.assertEqual(response.status_code, 204)
        with SessionLocal() as db:
            item = db.get(LostItem, item_id)
            if item is None:
                self.fail("Soft-deleted item was physically removed")
            self.assertTrue(item.is_deleted)
        self.assertEqual(self.client.get("/api/items/feed").json(), [])

    def test_main_feed_returns_only_active_lost_and_found_items(self) -> None:
        with SessionLocal() as db:
            db.add_all(
                [
                    LostItem(
                        title="Active lost item",
                        description="Active",
                        location="Library",
                        date_reported=datetime(2026, 10, 24, tzinfo=timezone.utc),
                        image_path="uploads/lost.png",
                    ),
                    FoundItem(
                        title="Deleted found item",
                        description="Deleted",
                        location="Cafeteria",
                        date_reported=datetime(2026, 10, 25, tzinfo=timezone.utc),
                        image_path="uploads/found.png",
                        is_deleted=True,
                    ),
                ]
            )
            db.commit()

        response = self.client.get("/api/items/feed")

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["title"], "Active lost item")
        self.assertEqual(payload[0]["item_type"], "lost")

    def test_existing_item_tables_receive_soft_delete_columns(self) -> None:
        legacy_engine = create_engine("sqlite://")
        self.addCleanup(legacy_engine.dispose)
        with legacy_engine.begin() as connection:
            connection.execute(text("CREATE TABLE lost_items (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE found_items (id INTEGER PRIMARY KEY)"))

        with patch.object(database, "engine", legacy_engine):
            database.ensure_item_soft_delete_columns()

        inspector = inspect(legacy_engine)
        for table_name in ("lost_items", "found_items"):
            columns = {column["name"] for column in inspector.get_columns(table_name)}
            self.assertIn("is_deleted", columns)
            with legacy_engine.connect() as connection:
                connection.execute(text(f"INSERT INTO {table_name} (id) VALUES (1)"))
                value = connection.execute(
                    text(f"SELECT is_deleted FROM {table_name} WHERE id = 1")
                ).scalar_one()
                self.assertFalse(value)


if __name__ == "__main__":
    unittest.main()
