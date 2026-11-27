-- =============================================================================
-- Migration 010 — notifications
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run twice.
--
-- Three tables, one job each:
--
--   notifications           what happened, shown in the app's bell. A row with
--                           no recipient is for everyone (a new announcement),
--                           so one announcement is one row, not one per member.
--   push_subscriptions      the phones and browsers that asked for alerts, and
--                           whose they are.
--   notification_settings   per member: when they last opened the bell (so
--                           unread needs no per-row bookkeeping) and which
--                           kinds they turned off.
--
-- "Whose" is an owner key: the member's person id, or "email:<address>" for a
-- committee admin who has no profile of their own.
-- =============================================================================

create table if not exists notifications (
  id          text primary key,
  -- Null means everyone
  recipient   text,
  kind        text not null,
  title       text not null,
  body        text not null default '',
  -- Always a path inside the app, never a full address
  url         text not null default '/',
  -- Who caused it, so nobody is told about their own post
  actor       text,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_created_idx on notifications (created_at desc);
create index if not exists notifications_recipient_idx on notifications (recipient, created_at desc);

create table if not exists push_subscriptions (
  -- The push service's address for this one browser; unique by nature
  endpoint    text primary key,
  owner       text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_owner_idx on push_subscriptions (owner);

create table if not exists notification_settings (
  owner       text primary key,
  seen_at     timestamptz,
  muted       text[] not null default '{}'
);

-- Same posture as every other table: no public access. Members reach these
-- only through the app's own server code.
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_settings enable row level security;
