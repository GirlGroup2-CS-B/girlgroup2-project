# Backend database setup

The backend uses PostgreSQL. Set `DATABASE_URL` in the VS Code PowerShell
terminal before running the initializer. Replace `YOUR_PASSWORD` with your
PostgreSQL password:

```powershell
$env:DATABASE_URL = "postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/campusfind"
python init_db.py
```

Install dependencies first with `python -m pip install -r requirements.txt`.
The PostgreSQL server, `campusfind` database, and `lostfound` schema must already
exist. The initializer creates any missing backend model tables in that schema.
URL-encode reserved characters in the password, such as `@`, `/`, or `:`.
