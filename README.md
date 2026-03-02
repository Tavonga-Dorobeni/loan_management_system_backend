# Backend Skeleton

Production-oriented Express and TypeScript backend scaffold with modular feature structure, Sequelize setup, Swagger wiring, logging, rate limiting, and placeholder integrations.

## Quick start

```bash
npm install
cp .env.example .env
npm run build
npm run dev
```

## Scripts

- `npm run dev` starts the TypeScript server with reload
- `npm run build` compiles TypeScript into `dist`
- `npm start` runs the compiled server through `start.js`
- `npm run db:migrate` runs Sequelize migrations

## Notes

- This scaffold intentionally contains placeholder service logic and TODO markers.
- External integrations such as Redis, S3, and email are wrapped but not fully implemented.
