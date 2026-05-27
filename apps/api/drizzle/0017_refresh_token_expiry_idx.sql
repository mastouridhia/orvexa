-- Cleanup queries for expired refresh tokens scan the entire table today
-- because only token_hash and user_id are indexed. Adding an index on
-- expires_at makes the periodic DELETE WHERE expires_at < now() a fast
-- range scan instead of a sequential scan, which matters as the table grows.
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_idx" ON "refresh_tokens" ("expires_at");
