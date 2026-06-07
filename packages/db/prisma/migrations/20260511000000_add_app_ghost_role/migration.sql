-- Add APP_GHOST to the AppRole enum.
-- APP_GHOST records are placeholder family-tree members that have no auth
-- (no email, no password) and no rich profile content. Used to represent
-- relatives who aren't on the platform.
ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'APP_GHOST';
