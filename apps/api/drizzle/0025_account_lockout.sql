ALTER TABLE "users"
  ADD COLUMN "failed_login_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" timestamp with time zone;
