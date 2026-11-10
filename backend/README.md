# House3 API — NestJS + PostgreSQL + Prisma

This backend was added **in a separate `backend/` directory**. The existing static frontend and 3D scene were not changed. It follows the supplied Real Estate Marketplace exam brief and the Advanced Prisma Queries lesson.

## Setup

1. Install Node.js 20+ and PostgreSQL; create a database named `house3`.
2. From `backend/`, run `npm install`.
3. Copy `.env.example` to `.env` and set valid `DATABASE_URL`, a long random `JWT_SECRET`, `FRONTEND_ORIGIN`, and `PUBLIC_API_URL`. Never commit `.env`.
4. Run `npm run db:generate`, `npm run db:push`, `npm run db:seed`.
5. Start with `npm run dev`. API listens on port 3000 by default.
6. Run the frontend with `npm start` from repository root. Set root `config.js`'s `apiBaseUrl` to the **public HTTPS backend URL** after deployment. GitHub Pages / static Cloudflare Pages do not run NestJS.

Optional admin bootstrap: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ chars) in local .env before `npm run db:seed`. Optional test-only listings: `DEMO_SEED=true` and `DEMO_SELLER_PASSWORD` (8+ chars) seed 2 demo sellers and 8 clearly labeled demo properties. Change passwords before real deployment. Run seeds only against a test database when using demo listings.

## Prisma queries added for the lesson

Public: `GET /properties?search=villa&city=Tashkent&category=house&type=SALE&minPrice=50000&maxPrice=250000&rooms=2&sort=price_asc&page=1&limit=12`

- Search: case-insensitive `contains` on title, description, and address
- Filter: `where` with `gte` / `lte` for prices, city, category slug, property type, and minimum rooms
- Sort: `orderBy` supports `asc`, `desc`, `price_asc`, `price_desc`, `newest`, `oldest`
- Pagination: `skip`, `take`, `count()` with maximum 50 results per page
- Public reads return only `APPROVED` listings.

## Routes

- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Profile: `GET /users/me`, `PATCH /users/me`
- Categories: `GET /categories`; admin `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`
- Listings: `GET /properties`, `GET /properties/:id`; authenticated `GET /properties/my`, `POST /properties`, `PATCH /properties/:id`, `DELETE /properties/:id`
- Images: `POST /properties/:id/images` multipart field `image` (JPEG, PNG, WebP, <=5MB); `DELETE /properties/:id/images/:imageId`
- Favorites: `GET /favorites`, `POST /favorites/:propertyId`, `DELETE /favorites/:propertyId`
- Inquiry: `POST /properties/:propertyId/inquiries`, `GET /inquiries/my`
- Admin: `GET /admin/properties?status=PENDING`, `PATCH /admin/properties/:id/status`, `GET /admin/users`

JWT header: `Authorization: Bearer <accessToken>`. Passwords are hashed with bcrypt. A user can only modify their own listing. Uploads use local filesystem and are **not persistent on most serverless hosts**; configure persistent storage for production. Public uploads URL is assembled from `PUBLIC_API_URL`.

## Verification still required

No live PostgreSQL or hosting environment was attached during development. This is an implementation commit, **not a claim of tested production readiness**. Run dependency installation, TypeScript build, migrations and end-to-end API tests against PostgreSQL. Verify register/login, ownership, uploads, moderation and public filters. Configure public HTTPS backend hosting and CORS before frontend can talk to the API.

The exam brief permits AI assistance but requires understanding code and declaring significant assistance. Explain and test your contributions during the defense.
