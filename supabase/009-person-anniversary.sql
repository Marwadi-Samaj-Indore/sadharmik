-- =============================================================================
-- Migration 009 — a wedding anniversary on each person
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- The anniversary used to live only on the household, which covers the head
-- and spouse and nobody else. In a joint family the married son and his wife
-- have an anniversary of their own, so it now lives on the person too. The
-- household column stays: it is still the head couple's date, and the app
-- keeps the two in step when the head or spouse edits theirs.
--
-- Adding a column to an existing table needs no new grant: the table's grants
-- already cover every column.
-- =============================================================================

alter table people add column if not exists anniversary date;
