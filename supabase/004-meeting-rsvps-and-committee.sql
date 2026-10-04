-- =============================================================================
-- Migration 004 — meeting attendance (RSVP) and the committee section
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
-- =============================================================================

-- One row per (meeting, person) — a member's headcount for that meeting,
-- e.g. "3 of us are coming". Upserted if they change their mind.
create table if not exists meeting_rsvps (
  id             text primary key,
  meeting_id     text not null references meetings (id) on delete cascade,
  person_id      text not null references people (id) on delete cascade,
  household_id   text not null references households (id) on delete cascade,
  attendee_count integer not null default 1 check (attendee_count between 1 and 20),
  responder_name text default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (meeting_id, person_id)
);

create index if not exists meeting_rsvps_meeting_idx on meeting_rsvps (meeting_id);
alter table meeting_rsvps enable row level security;

-- The committee section on Home — president, patrons, secretaries. Small and
-- admin-managed, not linked to a household. sort_order 0 is shown biggest.
create table if not exists committee_members (
  id         text primary key,
  name       text not null,
  role       text not null default '',
  phone      text,
  photo      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists committee_members_order_idx on committee_members (sort_order);
alter table committee_members enable row level security;
