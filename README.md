# CampusFind System

A full-stack lost-and-found platform for **JRMSU Main Campus**. Students and staff can report lost or found items, browse listings, claim belongings, and receive notifications — all through a modern web and mobile interface.

## Project Structure

```
CampusFind System/
├── backend/              # Node.js + Express API (MVC pattern)
│   ├── config/           # Database connection
│   ├── models/           # SQL queries (Model layer)
│   ├── controllers/      # Business logic (Controller layer)
│   ├── routes/           # API endpoints (Routes)
│   ├── middleware/       # JWT authentication
│   ├── server.js         # Entry point
│   ├── .env              # Environment config
│   └── package.json
├── Database/             # Database schema
│   └── campusfind_postgresql.sql
├── frontend/
│   ├── web/              # React + Vite web application
│   │   ├── src/
│   │   ├── index.html
│   │   └── package.json
│   ├── desktop/          # Electron desktop application
│   │   ├── main.js       # Electron main process
│   │   ├── preload.js    # IPC bridge (desktopAPI)
│   │   └── package.json
│   └── mobile/           # React Native / Expo mobile app
│       ├── App.tsx
│       └── package.json
└── README.md
```

## MVC Architecture

```
User → Routes → Controller → Model → PostgreSQL → Response
```

| Layer      | Role                | Folder         |
|------------|---------------------|----------------|
| Model      | Database queries    | `models/`      |
| Controller | Business logic      | `controllers/` |
| Routes     | API endpoints       | `routes/`      |
| View       | Frontend (React)    | `frontend/`    |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [PostgreSQL](https://www.postgresql.org/) installed and running
- [Postman](https://www.postman.com/) (optional, for API testing)

On Windows PowerShell, if the `npm` command is blocked by the execution policy,
use `npm.cmd` instead (for example, `npm.cmd install` and `npm.cmd run dev`).

### 1. Setup Database

```sql
-- Create the database
CREATE DATABASE campusfind_db;

-- Create the schema
CREATE SCHEMA IF NOT EXISTS "user";

-- Run the schema file
\i Database/campusfind_postgresql.sql
```

Make sure `backend/.env` uses `DB_NAME=campusfind_db` and has the credentials
for your local PostgreSQL server. Add a persistent `JWT_SECRET` value to the
same file; the API uses it to sign login tokens. Generate one with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and
keep it private.

### 2. Start Backend

The CampusFind API is the Node.js/Express backend. In Windows PowerShell, run:

```powershell
cd .\backend
npm.cmd run dev
```

**Expected output:**
```
CampusFind API server running on http://0.0.0.0:3000
PostgreSQL connected successfully
```

The active API is Node.js/Express. The existing Python/FastAPI code under
`backend/app` is a legacy prototype and is not part of this run path. The
running Express API is available at
`http://localhost:3000` on this computer and at
`http://<computer-Wi-Fi-IPv4>:3000` to devices on the same Wi-Fi. Find the
address using `ipconfig`. The phone and computer must be on the same network;
guest Wi-Fi or router client isolation may block device-to-device connections.
Interactive API documentation is available at `http://localhost:3000/docs`;
the OpenAPI specification is at `http://localhost:3000/docs/openapi.json`.
Administrators can search accounts and activate or deactivate student accounts
from the Admin Console. New public registrations always receive the student
role; administrator access must be assigned to an existing trusted account in
PostgreSQL.
The `"user".campusfind_account_statistics()` PostgreSQL function provides live
account counts to the administrator dashboard.

### 3. Start Frontend (Web)

```bash
cd frontend/web
npm install
npm run dev
```

Opens at http://localhost:5173. To open the web client on a phone, use
`http://<computer-LAN-IP>:5173` while both devices are on the same Wi-Fi.

### 4. Start Frontend (Mobile)

```bash
cd frontend/mobile
npm install
npm start
```

Keep the backend running. On a physical phone, connect the phone and computer
to the same Wi-Fi. Open the QR code from **Expo Go** on Android (install Expo Go
first); on iOS, use the Camera app or Expo Go. If scanning the QR opens nothing,
open Expo Go and scan from inside the app. If the network blocks local
connections, run `npx expo start --tunnel`.

Keep the backend running as well. A physical phone cannot use `localhost` to
reach your computer. The app detects the Expo host automatically in development.
If you need to set the API address manually, use the computer's actual Wi-Fi
IPv4 address (find it with `ipconfig`), for example
`http://192.168.1.25:3000`. Replace the example address with your own; do not
include angle brackets or type a placeholder such as `<computer-LAN-IP>`.
In PowerShell, set it before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.25:3000"
npm.cmd run start:clear
```

The app also falls back to the current browser/Expo host if this variable
contains an invalid example value. Android emulators use
`http://10.0.2.2:3000` only when no Expo host is available. Make sure
`backend/.env` also has a `JWT_SECRET` value; without it, the API cannot issue
sign-in tokens.

If Expo Go still shows an old API address, stop the existing Expo server,
start it again with `npm.cmd run start:clear`, and reload the app in Expo Go.
Do not type the example placeholders literally. If the phone still cannot
connect, confirm the backend is running and allow Node.js through Windows
Firewall on private networks.

### 5. Start Frontend (Desktop)

```bash
cd frontend/desktop
npm install
npm run build:web     # builds the web frontend first
npm start             # launches the Electron app
```

For development (with hot reload):
```bash
# Terminal 1: start Vite dev server
cd frontend/web && npx vite

# Terminal 2: start Electron in dev mode
cd frontend/desktop && npm run dev
```

## API Endpoints

| Method | Endpoint                      | Description              | Auth |
|--------|-------------------------------|--------------------------|------|
| POST   | `/api/auth/register`          | Create account           | No   |
| POST   | `/api/auth/login`             | Sign in                  | No   |
| GET    | `/api/items`                  | List all items           | No   |
| GET    | `/api/items/:id`              | Get item details         | No   |
| POST   | `/api/items`                  | Report lost/found item   | Yes  |
| PUT    | `/api/items/:id`              | Update a report          | Yes  |
| DELETE | `/api/items/:id`              | Soft-delete a report     | Yes  |
| GET    | `/api/claims/report/:id`      | Get claims for a report  | No   |
| POST   | `/api/claims`                 | Submit a claim           | Yes  |
| PATCH  | `/api/claims/:id/review`      | Review a claim (admin)   | Yes  |
| GET    | `/api/notifications`          | Get user notifications   | Yes  |
| PATCH  | `/api/notifications/:id/read` | Mark notification read   | Yes  |

## Testing with Postman

1. **Register:** POST `http://localhost:3000/api/auth/register`
   ```json
   { "full_name": "Juan Dela Cruz", "email": "juan@jrmsu.edu", "student_id": "2024-0001", "password": "password123" }
   ```

2. **Login:** POST `http://localhost:3000/api/auth/login`
   ```json
   { "email": "juan@jrmsu.edu", "password": "password123" }
   ```

3. **Get Items:** GET `http://localhost:3000/api/items`

## Tech Stack

- **Backend:** Node.js, Express.js, PostgreSQL, JWT, bcrypt
- **Frontend Web:** React, TypeScript, Vite
- **Frontend Desktop:** Electron (wraps web frontend with native features)
- **Frontend Mobile:** React Native, Expo
- **Database:** PostgreSQL with soft deletes

---

*CampusFind — Lost and found, made easier. JRMSU Main Campus.*
