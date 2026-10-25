# GirlGroup2 Project

Official repository for our group project.

## 👥 Team
- **Mariel** — Project Leader
- **Hanupay** — Full-Stack Developer
- **Miñoza** — UI/UX Designer
- **Arap** — Database Manager
- **Tiwanag** — Tester & Documentation

## 📋 Project Scope
_To be decided._

## 🛠️ Setup Instructions
If you are working on the Python backend, run these commands in your terminal:
1. `cd backend`
2. `pip install -r requirements.txt` (This installs FastAPI, TensorFlow, and scikit-learn)
3. Set `JWT_SECRET_KEY` to a private, random value before starting the API. In PowerShell, generate and set one with `$env:JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(32))"`. Do not commit the secret.
4. Start the API with `python -m uvicorn app.main:app --reload`. The API docs are available at `http://localhost:8000/docs`.
5. The default SQLite database is created at `backend/users.db`. Set `DATABASE_URL` to use a different database.
6. Run the backend endpoint tests with `python -m unittest discover -s tests -v`.

### Authentication endpoints
- `POST /api/auth/register` accepts `email` and `password` as JSON or URL-encoded form fields and creates an account.
- `POST /api/auth/login` accepts the same fields and returns a 30-minute JWT access token.
- Email addresses are normalized to lowercase. Passwords are stored as bcrypt hashes, never as plaintext.
- `POST /api/items/upload` accepts `multipart/form-data` with `item_type` (`lost` or `found`), `title`, `description`, `location`, and an `image` file. It saves supported image files (JPEG, PNG, GIF, or WebP, up to 10 MiB) under `backend/uploads/` and records the relative path and item details in the corresponding database table. `date_reported` and `user_id` are optional form fields.

## 🤝 Contributing
1. Create a branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m "Describe your change"`
3. Push: `git push -u origin feature/your-feature`
4. Open a Pull Request on GitHub.
