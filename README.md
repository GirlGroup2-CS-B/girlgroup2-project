# GirlGroup2 Project

Official repository for our group project.

## 👥 Team
- **Mariel** — Project Leader
- **Hanupay** — Full-Stack Developer
- **Miñoza** — UI/UX Designer
- **Arap** — Database Manager
- **Tiwanag** — Tester & Documentation

## Setup

The FastAPI backend owns the database connection. The web, mobile, and desktop
clients call its API; they do not connect to the database directly.

### Backend

In PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv-py312
$python = ".\.venv-py312\Scripts\python.exe"
& $python -m pip install -r requirements.txt
$env:JWT_SECRET_KEY = & $python -c "import secrets; print(secrets.token_urlsafe(32))"
& $python -m uvicorn app.main:app --reload --port 8000
```

The currently documented stable TensorFlow pip builds support Python 3.9–3.12;
Python 3.12 is recommended for a fresh environment. These commands create
`backend\.venv-py312` and leave any existing `backend\.venv` untouched. Install
Python 3.12 first if `py -3.12` is unavailable.

The API docs are at `http://localhost:8000/docs`. By default, SQLAlchemy creates
the SQLite database at `backend/users.db` and creates the `users` table when the
API starts. To use another SQLAlchemy database, set `DATABASE_URL` before
starting the API (for PostgreSQL, install the included `psycopg[binary]`
dependency and use a `postgresql+psycopg://...` URL).

If Windows reports that an Application Control policy blocked SQLAlchemy's
`_collections_cy` extension, check **Event Viewer → Applications and Services
Logs → Microsoft → Windows → CodeIntegrity → Operational** and share the
matching event with your IT administrator. Do not disable or bypass the policy;
changing Python versions alone does not grant permission to load a blocked file.

The web client origins `http://localhost:5173` and
`http://127.0.0.1:5173`, plus Expo web origins on port 8081, are allowed by
default. For a deployed web client, set `FRONTEND_ORIGINS` to a comma-separated
list of its exact origins before starting the API.

### Web client

In a second terminal:

```powershell
cd frontend_web
npm.cmd install
$env:VITE_API_URL = "http://localhost:8000"
npm.cmd run dev
```

Open the URL printed by Vite. `VITE_API_URL` can point at a deployed backend.

### Mobile client

```powershell
cd frontend_mobile
npm install
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8000"
npm run android
```

`10.0.2.2` is the Android emulator's route to the host computer. Use
`http://localhost:8000` for an iOS simulator, or the computer's LAN IP address
for a physical device. The phone and backend computer must be on the same
network.

### Desktop client

```powershell
cd frontend_desktop
npm install
$env:GIRLGROUP2_API_URL = "http://localhost:8000"
npm run dev
```

The Electron main process calls the API through a context-isolated preload
bridge. For a production build, run `npm run build` and then `npm start`.

### Authentication and database

- `POST /api/auth/register` accepts `email` and `password` as JSON and creates a
  database-backed account.
- `POST /api/auth/login` accepts the same fields and returns a 30-minute JWT.
- Email addresses are normalized to lowercase. Passwords are stored as bcrypt
  hashes, never as plaintext.
- The three clients provide registration and login forms; the JWT stays in
  client memory and is not persisted between app launches.

To run the backend authentication tests:

```powershell
cd backend
& .\.venv-py312\Scripts\python.exe -m unittest discover -s tests -v
```

## 🤝 Contributing
1. Create a branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m "Describe your change"`
3. Push: `git push -u origin feature/your-feature`
4. Open a Pull Request on GitHub.
