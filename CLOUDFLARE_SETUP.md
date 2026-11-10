# house3 — Cloudflare Pages + D1 registration

## Cloudflare-only authentication (no Railway/Render needed)

The Pages Function now handles registration, login, persistent sessions and profile editing using Cloudflare D1 whenever BACKEND_ORIGIN is **unset**. Passwords are salted PBKDF2-SHA256 hashes; bearer session tokens are randomly generated, expire after seven days, and only their SHA-256 hashes are stored. Login/register are limited to 30 attempts per IP per ten-minute window. Email addresses are normalized and uniquely indexed; public registration always creates USER accounts.

### Setup through the Cloudflare dashboard

1. Workers & Pages → Create → Pages → Connect GitHub → select saidkhujalucky-hub/house3, branch main. If the project exists, use its settings.
2. Framework preset: None. Repository root: empty. Build command: `npm run build:pages`. Output: `dist-pages`.
3. Storage & databases → D1 SQL Database → Create database, e.g. house3-auth.
4. Open that database's Console. Copy the SQL from `cloudflare/migrations/0001_auth.sql` and execute it. All three tables must exist.
5. Pages project → Settings → Bindings → Add → D1 database. Variable name **DB**, select house3-auth. Use a separate database for preview if desired.
6. Remove BACKEND_ORIGIN from the Pages environment variables to use D1 authentication. If it remains set, ALL API requests continue using the existing NestJS backend, including auth.
7. Redeploy the project after adding the binding.
8. Visit `https://YOUR_PROJECT.pages.dev/api/health`: expect status ok, backend cloudflare-d1. Register through `/#/register`, log in through `/#/login`, and refresh the profile page.

Deploy using Git integration (or Wrangler Pages deployment that compiles functions). Uploading only dist-pages through a static file drag-and-drop does not install the Pages Functions.

### Scope and data

D1 mode implements POST /auth/register, POST /auth/login, GET /auth/me, GET/PATCH /users/me, POST /auth/logout and GET /health, all under /api. Existing frontend form contracts are preserved. Profile data survives redeploys; sessions persist until expiry/revocation. The frontend stores bearer tokens in sessionStorage, so closing the browser tab requires signing in again.

The existing 3D house and frontend catalog are retained. Other marketplace API endpoints (listing CRUD, favorites, uploads, inquiries and admin) still require the NestJS backend and return an explicit 501 in D1 auth-only mode. No dummy successful writes are returned.

D1 users are separate from existing PostgreSQL users. Changing between D1 and NestJS modes does not migrate users or passwords; sign in with an account belonging to the selected mode. Do not mix auth providers within one deployment.

## Existing full NestJS backend (optional alternative)

Set BACKEND_ORIGIN to its public HTTPS origin, e.g. https://YOUR_BACKEND_DOMAIN, with no path. The proxy forwards all API endpoints to it. Configure backend DATABASE_URL, JWT_SECRET, PUBLIC_API_URL and FRONTEND_ORIGIN, initialize PostgreSQL schema and run the existing backend deployment instructions in backend/README.md. D1 is not used in this mode.

## Verification and troubleshooting

- `npm run test:cloudflare` (Node 24+) tests the real SQL schema using node:sqlite, auth lifecycle, validation, duplicate accounts, expiry, role protection, throttling and proxy forwarding.
- `npm run build:pages` assembles only public assets. Server code, migrations and tests are excluded.
- 503 with DB setup message: missing binding or missing schema.
- 409: email already exists. 401: invalid credentials/session. 429: retry after ten minutes.
- GitHub Pages is static and cannot run these Functions; use the Cloudflare Pages URL for registration.
- Committing code does not create the D1 database or configure your Cloudflare account automatically.

Cloudflare reference: https://developers.cloudflare.com/pages/functions/bindings/#d1-databases
