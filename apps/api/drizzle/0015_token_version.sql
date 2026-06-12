-- tokenVersion is embedded in each access token. Bumping it on role change or
-- account disable/enable immediately invalidates all outstanding access tokens
-- for that staff member without needing a token blocklist.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 1;
