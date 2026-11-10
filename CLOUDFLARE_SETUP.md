# Cloudflare Pages deployment for house3

Cloudflare Pages serves the static frontend and a small proxy in `functions/api/[[path]].js`. The proxy forwards `/api/*` to a **separately deployed HTTPS NestJS backend**. Cloudflare Pages alone does not host PostgreSQL, NestJS or local uploads.

## 1. Deploy backend first
Host `backend/` on a Node.js hosting platform (e.g. Railway) with PostgreSQL.
- Set project root `backend`.
- Build: `npm install && npx prisma generate && npm run build`.
- For an initially empty demo database run `npx prisma db push` once from a trusted CLI. For production, use versioned Prisma migrations instead.
- Start: `node dist/main.js`.
- Secrets/environment: `DATABASE_URL`, a strong `JWT_SECRET`, `PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN`, `FRONTEND_ORIGIN=https://YOUR_CLOUDFLARE_DOMAIN`, and `PORT` if required.
- For locally stored listing images, attach persistent storage; ephemeral host filesystem will lose images after restarts. `uploads/` must persist in production.
- Test `https://YOUR_BACKEND_DOMAIN/health`: should return `{ "status":"ok" }` after database setup.

## 2. Deploy frontend on Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Select `saidkhujalucky-hub/house3`, branch `main`.
3. Framework preset: None; root directory: repository root; Build command: `npm run build:pages`; Output directory: `dist-pages`.
4. Settings → Environment variables → add `BACKEND_ORIGIN` with the backend HTTPS origin, **no trailing slash or path**, e.g. `https://YOUR_BACKEND_DOMAIN`. Set for production (and preview separately if used).
5. Redeploy after setting `BACKEND_ORIGIN`. A Pages Function will forward requests to the backend at the same origin as the frontend using `/api/auth/register`, etc.
6. Test `https://YOUR_CLOUDFLARE_DOMAIN/api/health` and then register a test account. Confirm `POST /api/auth/register` returns 201, and `POST /api/auth/login` returns `accessToken`. Never use your real password in an unverified deployment.

## 3. Important
- Cloudflare requires you to authorize GitHub integration and create the Pages project. This setup cannot be completed by GitHub commits alone.
- GitHub Pages will continue using the old localhost API setting until an explicit public API URL is configured for GitHub Pages. This file switches Cloudflare Pages and custom-domain deployments to the same-origin `/api` proxy.
- The frontend's existing 3D house remains unchanged.
- A 503 response from `/api/health` means `BACKEND_ORIGIN` is missing/invalid. A 502 response means Cloudflare could not reach the backend.
