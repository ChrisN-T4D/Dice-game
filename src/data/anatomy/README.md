# Anatomy data

- **Database:** `server/db/anatomy.sqlite` (built via `npm run db:migrate` and `npm run db:seed`)
- **API:** `server/src/index.js` — import zones at runtime through [`client.js`](client.js)
- **Taxonomy:** [`regions.js`](regions.js) — region/sub-region definitions used by the seed script
- **Profiles:** [`profiles/`](profiles/) — one chunk file per sub-region; merged at seed time (see [`PROFILE_SCHEMA.md`](PROFILE_SCHEMA.md))

Do not add full-matrix JavaScript files here. Use the API or extend SQL migrations.
