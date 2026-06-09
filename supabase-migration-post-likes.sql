-- Migration: like the whole POST, not individual routes
-- Product change: a like now applies to an entire rider submission (photo +
-- info + route), not to a city route or a rider's route pick separately. The two
-- old like targets collapse into one 'post' like keyed by submissions.id, reusing
-- the submissions.like_count counter. The 'route'/'rider_route' types are kept in
-- the check constraint for backward-compat but the app no longer writes them.
-- Safe to run once and idempotent.

BEGIN;

-- Allow 'post' as a like target.
ALTER TABLE content_likes DROP CONSTRAINT IF EXISTS content_likes_target_type_check;
ALTER TABLE content_likes ADD CONSTRAINT content_likes_target_type_check
  CHECK (target_type IN ('route', 'rider_route', 'post'));

-- toggle_like: accept 'post' (counts on submissions, same as rider_route).
CREATE OR REPLACE FUNCTION toggle_like(p_target_type text, p_target_id uuid, p_visitor_id text)
RETURNS TABLE (liked boolean, like_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists boolean;
  v_delta integer;
  v_count integer;
BEGIN
  IF p_target_type NOT IN ('route', 'rider_route', 'post') THEN
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

  -- 'route' counts on routes; 'rider_route' and 'post' both count on submissions.
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

COMMIT;
