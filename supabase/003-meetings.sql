-- =============================================================================
-- Migration 003 — group meetings
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- Committee-posted, like an announcement — outings, monthly get-togethers,
-- themed evenings. The Kwik Pic link is added afterwards, once photos from
-- the meeting are ready to share. Deliberately small: no comments, no RSVP.
-- =============================================================================

create table if not exists meetings (
  id            text primary key,
  title         text not null,
  description   text default '',
  location      text default '',
  meeting_date  date not null,
  meeting_time  text default '',
  photo         text,
  kwik_pic_url  text,
  author_name   text default '',
  author_email  text,
  created_at    timestamptz not null default now()
);

create index if not exists meetings_date_idx on meetings (meeting_date desc);

-- Same posture as every other table: no public access. Members reach this only
-- through the app's own server code, which checks permissions first.
alter table meetings enable row level security;
