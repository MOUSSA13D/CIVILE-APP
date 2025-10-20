# CIVILE-APP Backend (Node + TypeScript + MongoDB)

This is the backend API for CIVILE-APP: birth declaration workflow for Parents, Mairie, and Hospital.

## Tech

- Express + TypeScript
- MongoDB (Mongoose)
- JWT auth, role-based access
- Mock payments (Wave / Orange Money)
- HTML extract generation (single-download)

## Setup

1. Copy environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set:

- `MONGODB_URI` (paste your connection string)
- `JWT_SECRET` (any strong secret)
- Optional: `PORT`, `CORS_ORIGIN`

3. Install dependencies:

```bash
npm install
```

4. Run in dev:

```bash
npm run dev
```

Server will show a warning if `MONGODB_URI` is not set and will skip DB connect. Provide it to enable persistence.

## Seed test agents

Register Parent via `/auth/register`. For agents, login with:

- Mairie: `agent@mairie.gouv.sn` with any password after you create the user manually or add a quick seed.
- Hopital: `agent@hopital.gouv.sn` similar.

To quickly create agents, use MongoDB to insert users with roles `mairie` and `hopital` and a bcrypt hash for the chosen password.

## Key Endpoints

- `POST /auth/register` (parent)
- `POST /auth/login` (all roles)
- `POST /declarations` (parent)
- `GET /declarations/me` (parent)
- `PUT /declarations/:id` (parent, pending/rejected only)
- `POST /declarations/:id/pay` (parent; provider: `wave` or `orange_money`)
- `GET /declarations/:id/extract` (parent; once only)
- `GET /mairie` (mairie list + stats)
- `POST /mairie/:id/send-to-hospital`
- `POST /mairie/:id/validate`
- `POST /mairie/:id/reject`
- `GET /hopital` (to verify)
- `POST /hopital/:id/confirm`
- `POST /hopital/:id/reject`

## Notes

- Replace the payment mock with real Wave/Orange Money integrations for production.
- Add file storage for certificate photos (e.g., S3/Supabase Storage) and replace `certificatePhotoUrl` handling.
- Enforce stricter validation (zod) and add tests before going live.
