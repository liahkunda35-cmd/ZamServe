# ZamServe

Service-booking marketplace for Zambia. Customers book beauty, repair, and cleaning services. Providers offer any number of those services, receive only matching requests, and move jobs from acceptance through completion.

PostgreSQL is not installed on this machine, so the relational model runs on SQLite through Prisma (`prisma/dev.db`). The tables match the marketplace relationships: a provider has many services, each service belongs to one of the three categories, and a booking points at one customer, one provider, and one service.

## Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

Create a customer or provider account from the welcome screen. The database starts with the three categories and their services only. No sample customers, providers, or bookings are included.

## Environment

Copy `.env.example` to `.env`.

- `DATABASE_URL` — SQLite file, or a PostgreSQL URL if you change the Prisma datasource provider
- `JWT_SECRET` — session signing secret
- `ALLOW_DEV_RESET` — include password-reset codes in the API response for local use
- `OSRM_URL` — driving directions for live jobs
- `NEXT_PUBLIC_MAP_TILE_URL` — map tiles (OpenStreetMap by default)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — reserved if you switch the map to Google
