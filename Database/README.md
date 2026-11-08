# CampusFind Database

## Files

- `campusfind_postgresql.sql` — The PostgreSQL schema for the CampusFind
  system. Run this against your PostgreSQL server to create all tables, views,
  indexes, and triggers in the `"user"` schema.

## Setup

```sql
-- 1. Create the database
CREATE DATABASE campusfind_db;

-- 2. Connect to it
\c campusfind_db

-- 3. Create the schema
CREATE SCHEMA IF NOT EXISTS "user";

-- 4. Run the SQL file
\i campusfind_postgresql.sql
```

## Tables

| Table               | Purpose                                    |
|---------------------|--------------------------------------------|
| `"user".users`      | Student/admin accounts                     |
| `"user".item_reports` | Lost and found item reports              |
| `"user".claims`     | Ownership claims on found items            |
| `"user".notifications` | User notification messages              |
| `"user".image_searches` | Image-based search attempts            |
| `"user".image_search_matches` | Results from image matching      |

## Account Statistics Function

The `"user".campusfind_account_statistics()` PostgreSQL function returns
total, active, inactive, student, reviewer, and administrator account counts.
It is used by the administrator dashboard and can also be run in pgAdmin's
Query Tool:

```sql
SELECT * FROM "user".campusfind_account_statistics();
```

In pgAdmin, refresh the `"user"` schema's **Functions** node to see the
function. The function is owned by the database migration user and is not
granted to `PUBLIC`.

## Legacy Files

- `campusfind.db` — Old SQLite database (kept for reference)
- `backend_users.db` — Old SQLite database used by the Python backend prototype
