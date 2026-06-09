-- Migration: unified content likes (❤️ on both city routes AND rider-submitted routes)
-- Supersedes supabase-migration-route-likes.sql. One polymorphic likes table keyed
-- by (target_type, target_id) so any likeable thing shares the same mechanism:
--   target_type = 'route'        -> target_id = routes.id        (AI city classic route)
--   target_type = 'rider_route'  -> target_id = submissions.id   (rider's own route pick)
-- Denormalized like_count lives on each target table for free O(0) SSR reads; the
-- toggle function keeps it in sync atomically. Only the service-role API writes here.
-- Safe to run once, and safe to run on a DB that already ran the old route-likes
-- migration (it migrates the old rows in and drops the old objects).

BEGIN;

-- Denormalized counters on each likeable table (idempotent for fresh + upgraded DBs).
ALTER TABLE routes      ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('route', 'rider_route')),
  target_id uuid NOT NULL,
  -- anonymous visitor id (random uuid persisted in localStorage)
  visitor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_content_likes_target ON content_likes (target_type, target_id);

-- Carry over rows from the old route_likes table if it exists, then retire it.
DO $$
BEGIN
  IF to_regclass('public.route_likes') IS NOT NULL THEN
    INSERT INTO content_likes (target_type, target_id, visitor_id, created_at)
      SELECT 'route', route_id, visitor_id, created_at FROM route_likes
      ON CONFLICT (target_type, target_id, visitor_id) DO NOTHING;
    DROP TABLE route_likes;
  END IF;
END $$;

DROP FUNCTION IF EXISTS toggle_route_like(uuid, text);

-- Atomic toggle for any target. Flips the visitor's like and keeps the matching
-- table's like_count in sync inside one statement-set to avoid races.
CREATE OR REPLACE FUNCTION toggle_like(p_target_type text, p_target_id uuid, p_visitor_id text)
RETURNS TABLE (liked boolean, like_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists boolean;
  v_delta integer;
  v_count integer;
BEGIN
  IF p_target_type NOT IN ('route', 'rider_route') THEN
    RAISE EXCEPTION 'invalid target_type: %', p_target_type;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM content_likes
    WHERE target_type = p_target_type AND target_id = p_target_id AND visitor_id = p_visitor_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM content_likes
      WHERE target_type = p_target_type AND target_id = p_target_id AND visitor_id = p_visitor_id;
    v_delta := -1;
    liked := false;
  ELSE
    INSERT INTO content_likes (target_type, target_id, visitor_id)
      VALUES (p_target_type, p_target_id, p_visitor_id);
    v_delta := 1;
    liked := true;
  END IF;

  IF p_target_type = 'route' THEN
    UPDATE routes SET like_count = GREATEST(routes.like_count + v_delta, 0)
      WHERE id = p_target_id RETURNING routes.like_count INTO v_count;
  ELSE
    UPDATE submissions SET like_count = GREATEST(submissions.like_count + v_delta, 0)
      WHERE id = p_target_id RETURNING submissions.like_count INTO v_count;
  END IF;

  like_count := COALESCE(v_count, 0);
  RETURN NEXT;
END;
$$;

-- Lock the table down; only the service role (bypasses RLS) writes via the API.
ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;

COMMIT;
