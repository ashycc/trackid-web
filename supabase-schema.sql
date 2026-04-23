-- TRACKID Rider Gallery — Database Schema
-- Run this in Supabase SQL Editor

-- 1. Submissions table
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id integer UNIQUE,
  rider_name text NOT NULL,
  location text NOT NULL,
  email text,
  photo_paths text[] NOT NULL CHECK (array_length(photo_paths, 1) BETWEEN 1 AND 3),
  cover_index integer NOT NULL DEFAULT 0 CHECK (cover_index >= 0 AND cover_index < array_length(photo_paths, 1)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  latitude float8,
  longitude float8,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- 2. REGISTRY sequence (atomic TKID assignment)
CREATE SEQUENCE registry_seq START 1;

-- 3. Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public: read approved submissions
CREATE POLICY "Public can view approved"
  ON submissions FOR SELECT
  USING (status = 'approved');

-- Public: insert new submissions
CREATE POLICY "Public can submit"
  ON submissions FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND registry_id IS NULL
    AND reviewed_at IS NULL
  );

-- Service role: full access (admin operations)
-- Service role bypasses RLS by default, no policy needed

-- 4. Index for common queries
CREATE INDEX idx_submissions_status ON submissions (status);
CREATE INDEX idx_submissions_registry_id ON submissions (registry_id);
