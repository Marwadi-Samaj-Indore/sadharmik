-- =============================================================================
-- Migration 005 — meeting organisers
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- Free text, not a link to people — the organiser is often named the way the
-- committee would say it out loud ("Suresh & Rekha Jain"), not necessarily a
-- member already in the directory.
-- =============================================================================

alter table meetings add column if not exists organisers text default '';
