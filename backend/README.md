# Backend database setup

The backend uses SQLite with SQLAlchemy. To create `campusfind.db` and its
`users` table, run the initializer from the backend directory:

```powershell
python -m pip install -r requirements.txt
python init_db.py
```

The database file is created in this directory. The `User` model is defined in
`app/models/user.py`; its password field stores a password hash, not a
plaintext password.
