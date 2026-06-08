-- Migration: let riders recommend a local cycling route on their submission.
-- Stored as free text (a route name and/or a Google Maps / Strava / komoot link).
-- Surfaced to the admin and fed to Doubao as a hint when generating the city route.
-- Safe to run once.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS route_suggestion text;
