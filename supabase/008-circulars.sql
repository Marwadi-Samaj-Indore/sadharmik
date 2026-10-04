-- =============================================================================
-- Migration 008 — committee circulars
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- A circular is a document, not a post. It is typed on letterhead, signed, and
-- referred back to months later, so the file is the thing and the title and
-- note exist only to make it findable without opening it.
--
-- Deliberately its own table rather than a third `posts.type`. Posts carry
-- comments, pinning, expiry and a weekly limit per member, none of which a
-- circular wants; the shared column would have been mostly nulls in both
-- directions.
-- =============================================================================

create table if not exists circulars (
  id            text primary key,
  title         text not null,
  note          text default '',
  file_path     text not null,
  file_type     text not null default 'pdf' check (file_type in ('pdf', 'image')),
  file_name     text default '',
  -- Who posted it. Only the committee can, but which member of it matters
  author_person_id text references people (id) on delete set null,
  author_name   text default '',
  author_email  text,
  created_at    timestamptz not null default now()
);

create index if not exists circulars_created_idx on circulars (created_at desc);

-- Same posture as every other table: no public access. Members reach this only
-- through the app's own server code, which checks permissions first.
alter table circulars enable row level security;
