# PRIME Finance Dashboard (Node.js + DB + Auth)

A gamified personal-finance dashboard inspired by modern fintech templates, built with:

- Node.js + Express backend
- SQLite database
- JWT authentication (register/login/protected API)
- Responsive dashboard UI

## 1) Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example`:

   ```bash
   copy .env.example .env
   ```

3. Initialize and seed the database:

   ```bash
   npm run init-db
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   - `http://localhost:4000`

## 2) Authentication Flow

- Open `/signup` and create your account.
- You are automatically logged in and redirected to `/dashboard`.
- Log out and use `/login` for returning users.

## 3) API Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/dashboard/overview` (Bearer token)

## 4) Notes

- This is a starter foundation. You can extend it with expenses CRUD, charts, notifications, and challenge systems.
- For production, use secure cookie-based auth, stricter input validation, and HTTPS.
