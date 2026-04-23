-- Migration: single photo_path → multi photos (up to 3) + cover selection
-- Run AFTER the initial supabase-schema.sql if that was deployed previously.
-- Safe to run once; includes guards so re-running is a no-op.

BEGIN;

-- 1. Add new columns (nullable first so we can backfill)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS photo_paths text[],
  ADD COLUMN IF NOT EXISTS cover_index integer NOT NULL DEFAULT 0;

-- 2. Backfill photo_paths from legacy photo_path
UPDATE submissions
SET photo_paths = ARRAY[photo_path]
WHERE photo_paths IS NULL AND photo_path IS NOT NULL;

-- 3. Enforce NOT NULL + range checks
ALTER TABLE submissions
  ALTER COLUMN photo_paths SET NOT NULL;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_photo_paths_len_chk,
  ADD CONSTRAINT submissions_photo_paths_len_chk
    CHECK (array_length(photo_paths, 1) BETWEEN 1 AND 3);

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_cover_index_chk,
  ADD CONSTRAINT submissions_cover_index_chk
    CHECK (cover_index >= 0 AND cover_index < array_length(photo_paths, 1));

-- 4. Drop legacy column
ALTER TABLE submissions DROP COLUMN IF EXISTS photo_path;

COMMIT;
