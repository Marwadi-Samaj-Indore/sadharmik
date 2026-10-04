-- =============================================================================
-- Migration 007 — meeting Google Drive link
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- Sits beside kwik_pic_url rather than replacing it. Kwik Pic is where the
-- photographer's set goes; a Drive folder is where everything else does —
-- the papers, the video, the shots members took themselves.
-- =============================================================================

alter table meetings add column if not exists drive_url text;
