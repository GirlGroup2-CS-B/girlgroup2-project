# Backend database setup

The backend uses PostgreSQL. To configure a local connection from VS Code:

1. In the VS Code PowerShell terminal, change to the backend folder:

   ```powershell
   cd backend
   ```

2. Create a private environment file and edit it:

   ```powershell
   Copy-Item .env.example .env
   code .env
   ```

   Update `DATABASE_URL` with the username, password, host, port, and database
   name for your local PostgreSQL instance. The example uses `localhost:5432`
   and a database named `campusfind`. Keep `.env` private; Git ignores it.
   URL-encode reserved characters in the password, such as `@`, `/`, or `:`.

3. Install the backend dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

4. Test the connection from the backend folder:

   ```powershell
   python -c "from sqlalchemy import text; from app.models.database import engine; connection = engine.connect(); print(connection.execute(text('SELECT 1')).scalar()); connection.close()"
   ```

   A successful connection prints `1`. Start the API with
   `uvicorn app.main:app --reload`.

The backend ORM now uses the CampusFind tables in the `"user"` schema:
`users`, `item_reports`, `claims`, `notifications`, `image_searches`, and
`image_search_matches`. Lost and Found reports are represented by a single
`item_reports` table with a `report_type`; the old separate Lost/Found models
have been removed.

To initialize tables from the backend models, run `python init_db.py`. For the
full CampusFind database setup, including views and triggers, execute the
repository's `campusfind` SQL script against the `campusfind` database using
your PostgreSQL client. Neither setup drops or deletes existing tables/data.

## SQLite user-table setup

The SQLite setup is separate from the PostgreSQL backend. To create
`backend/campusfind.db` and its `users` table, run this from the `backend`
directory:

```powershell
python -m pip install -r requirements.txt
python init_sqlite_db.py
```

The SQLite model is in `app/models/sqlite_user.py`. Its password field stores
a password hash, not a plaintext password. The SQLite database file is ignored
by Git.

Lost and found reports use the database's existing `items` table, with
`item_type` distinguishing each report. The model in
`app/models/item_report.py` also defines the matching `categories` and
`locations` tables. Reports retain the database's `date_lost_found`, `image`
(image path), `location_id`, `category_id`, and `user_id` columns.
