# @genealogiq/db

The one canonical Prisma schema. All three apps (`app`, `bms`, `seq`) read and
write the same database through this package — `check:schema-parity` in CI
enforces that no app keeps a schema of its own.

## Migrations

### They apply themselves now

Merging a migration to `main` triggers `.github/workflows/migrate.yml`, which
runs `prisma migrate deploy` **once** and reports `migrate status` before and
after. Nothing else needs doing.

The workflow is path-filtered to `packages/db/prisma/migrations/**`, so an
ordinary merge never touches the database.

### Why a workflow and not the Vercel build

The three apps are three Vercel projects that build **in parallel** from this
repo against **one** database. Putting `migrate deploy` in each build command
would fire three concurrent migrations on every deploy: Prisma's advisory lock
would serialise them, but two of the three would be pure waste and a lock
timeout would fail a deploy for no reason. Preview builds would also migrate
production. One job, one run.

### One-time setup (needed before the first automated run)

The workflow needs a repository **Environment** named `production` holding a
secret `DATABASE_URL_DIRECT`:

1. GitHub → Settings → Environments → New environment → `production`
   (optionally add yourself as a required reviewer — the run then waits for
   approval before it touches the database).
2. Add secret `DATABASE_URL_DIRECT` = the Neon connection string for the
   production branch, **without** `-pooler` in the host.

That last part matters: the app's normal `DATABASE_URL` points at Neon's
pooler, and DDL over PgBouncer in transaction mode fails or hangs. The workflow
refuses to run if the URL it is given contains `-pooler`, rather than hanging.

`prisma.config.ts` reads `DATABASE_URL`, so the direct URL is supplied under
that name in the workflow.

### Running one by hand

Rarely needed — `workflow_dispatch` replays the workflow without an empty
commit. If you do need to:

```bash
# from the repo root, with DATABASE_URL pointing at the DIRECT (non-pooled) host
pnpm db:migrate:status    # what is pending
pnpm db:migrate:deploy    # apply it
```

Never run `prisma migrate dev` against production — it can reset and reseed.
`deploy` only applies what exists and never generates or destroys.

### Writing one

Migrations are hand-written SQL under
`packages/db/prisma/migrations/<14-digit-timestamp>_<name>/migration.sql`.
`pnpm check:migrations` (blocking in CI, no DB credential involved) verifies
each one has a non-empty `migration.sql` and a unique, correctly-ordered
timestamp — Prisma applies migrations in lexicographic order, so a timestamp
that sorts before an already-applied one is silently skipped.

`0_init` is the squashed baseline from the three-repo consolidation and is
exempt from the timestamp rule.

Destructive migrations deserve a comment block recording the read-only survey
that justified them — see `20260823000000_retire_digital_qr` for the shape:
what was counted, what it showed, and why the deletion was safe.

## Client generation

`postinstall` runs `prisma generate`, so a fresh `pnpm install` is enough.
After editing `schema.prisma`, run `pnpm db:generate` to refresh the client —
typecheck will otherwise still be validating against the old shape.
