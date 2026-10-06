# Local tracker with Supabase

Project: `stdevrfrwsssitejumwv` (10x Media Job Tracker).

The local application uses the private `studio_tracker` PostgreSQL schema. Its tables are not exposed through the public Data API. Existing application roles and login accounts are retained; Supabase Auth is not enabled for app logins in this migration.

Run `npm run start` to start the local app, the authenticated loopback database connection on port 8788, and automatic Google Sheets saving. PostgreSQL uses the project's CA certificate with full certificate verification. Internet access is required for database operations. The app fails a database request when Supabase is unavailable; it does not silently write to SQLite.

Private settings are in ignored `.wrangler/supabase-connection.json`, `.wrangler/supabase-bridge.json`, `.wrangler/supabase-ca.crt`, `.env.supabase`, and `.dev.vars`. Do not commit them. Refresh local bindings with `node scripts/configure-supabase.mjs` after changing connection settings.

The pre-migration SQLite database remains untouched and a consistent backup was saved under ignored `backups/`. Restoring SQLite after new cloud writes requires reconciling those writes first; do not simply switch back and discard them.

`scripts/migrate-supabase.mjs --apply` performs a one-time migration, refuses to overwrite an existing schema, and compares every field before committing. `scripts/verify-supabase-app.mjs` verifies an app write directly in PostgreSQL and removes its temporary goal type.
