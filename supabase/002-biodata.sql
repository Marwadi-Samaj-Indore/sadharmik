-- =============================================================================
-- Migration 002 — marriage biodata repository
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- A biodata is NOT tied to a member record. Members share documents for
-- relatives who may live anywhere and may not be in the samaj at all, so the
-- subject is just a name typed by the uploader. One member can share many.
--
-- The point of contact is whoever uploaded it — that is the person another
-- family should message.
-- =============================================================================

-- PMConnect's copy of this file began by dropping the table, to replace an early
-- draft keyed on person_id. Sadharmik never had that draft, and a drop here would
-- wipe every shared biodata if the file were ever run again, so it creates the
-- table only when missing, like every other file.
create table if not exists biodata (
  id            text primary key,
  title         text not null,          -- name of the person the biodata is for
  file_path     text not null,
  file_type     text not null default 'pdf' check (file_type in ('pdf', 'image')),
  file_name     text default '',
  note          text default '',
  -- Who shared it, and therefore who to contact
  uploader_person_id text references people (id) on delete set null,
  uploader_name text default '',
  uploader_email text,
  created_at    timestamptz not null default now()
);

create index if not exists biodata_created_idx on biodata (created_at desc);
create index if not exists biodata_uploader_idx on biodata (uploader_person_id);

-- Same posture as every other table: no public access. Members reach this only
-- through the app's own server code, which checks permissions first.
alter table biodata enable row level security;
