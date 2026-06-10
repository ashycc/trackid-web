-- One-off: collapse all registry_id gaps to 1..N (preserves current order).
-- Run once in Supabase SQL Editor. Safe to re-run — it's idempotent.
--
-- WARNING: rewrites existing TKID numbers. Any TKID-XXXX previously emailed
-- to riders may no longer match what's on the site. This matches the behavior
-- requested for delete renumbering.
--
-- Two steps to dodge the UNIQUE(registry_id) constraint:
--   1) move every row to a negative slot (unique, out of the way)
--   2) flip them back to their final positive sequence

BEGIN;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY registry_id) AS new_rid
  FROM submissions
  WHERE registry_id IS NOT NULL
)
UPDATE submissions s
SET registry_id = -ordered.new_rid
FROM ordered
WHERE s.id = ordered.id;

UPDATE submissions
SET registry_id = -registry_id
WHERE registry_id < 0;

COMMIT;

-- Verify after running:
-- SELECT registry_id, rider_name FROM submissions
--   WHERE registry_id IS NOT NULL ORDER BY registry_id;
