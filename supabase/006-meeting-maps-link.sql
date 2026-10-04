-- =============================================================================
-- Migration 006 — meeting Google Maps link
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- Same idea as household.maps_url — "Location" stays a plain venue name
-- (e.g. "Geeta Bhawan community hall"), this is the optional link that
-- actually opens the pin.
-- =============================================================================

alter table meetings add column if not exists maps_url text;
