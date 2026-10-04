-- =============================================================================
-- Sadharmik — database schema
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
--
-- SECURITY MODEL
-- Members never talk to this database directly. Every read and write goes
-- through the app's own server code, which checks permissions first (see
-- lib/session.ts canEdit). So Row Level Security is switched ON with no public
-- policies at all: the anon key can read nothing, and the server connects with
-- the service key which bypasses RLS. That means a leaked anon key exposes
-- nothing, and there are no subtle policy holes to get wrong.
-- =============================================================================

-- ----------------------------------------------------------------- households
create table if not exists households (
  id            text primary key,
  family_name   text not null,
  surname       text default '',
  gotra         text default '',
  native_place  text default '',
  address       text default '',
  area          text default '',
  city          text default 'Indore',
  pincode       text default '',
  maps_url      text default '',
  photo         text,
  anniversary   date,
  head_person_id text,
  source_row    integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists households_area_idx on households (area);
create index if not exists households_surname_idx on households (surname);
-- Day-and-month lookup for "today's anniversaries", ignoring the year
create index if not exists households_anniversary_md_idx
  on households (extract(month from anniversary), extract(day from anniversary));

-- --------------------------------------------------------------------- people
create table if not exists people (
  id               text primary key,
  household_id     text not null references households (id) on delete cascade,
  first_name       text not null default '',
  middle_name      text default '',
  last_name        text default '',
  relationship     text not null default 'other'
                     check (relationship in ('self','spouse','child','parent','other')),
  gender           text default '',
  photo            text,
  mobile           text,
  whatsapp         text,
  email            text default '',
  dob              date,
  blood_group      text default '',
  marital_status   text default '',
  living_in        text default '',
  education        text default '',
  occupation_type  text default '',
  business         jsonb not null default '{}'::jsonb,
  privacy          jsonb not null default '{}'::jsonb,
  deceased         boolean not null default false,
  claimed_by_email text,
  age              integer,
  birth_year       integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists people_household_idx on people (household_id);
create index if not exists people_mobile_idx on people (mobile);
create index if not exists people_claimed_idx on people (claimed_by_email);
create index if not exists people_category_idx on people ((business ->> 'category'));
create index if not exists people_dob_md_idx
  on people (extract(month from dob), extract(day from dob));

-- The identity gate looks members up by the last 4 digits of their mobile
create index if not exists people_mobile_last4_idx on people (right(mobile, 4));

-- ---------------------------------------------------------------------- posts
-- Announcements and requirements share one table, separated by `type`
create table if not exists posts (
  id               text primary key,
  type             text not null check (type in ('announcement','requirement')),
  author_person_id text references people (id) on delete set null,
  author_name      text not null default '',
  author_email     text,
  title            text not null,
  body             text not null default '',
  category         text default '',
  area             text default '',
  photo            text,
  pinned           boolean not null default false,
  comments_locked  boolean not null default false,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz
);

create index if not exists posts_type_created_idx on posts (type, created_at desc);
create index if not exists posts_expires_idx on posts (expires_at);

-- ------------------------------------------------------------------- comments
create table if not exists comments (
  id               text primary key,
  post_id          text not null references posts (id) on delete cascade,
  author_person_id text references people (id) on delete set null,
  author_name      text not null default '',
  author_email     text,
  body             text not null,
  created_at       timestamptz not null default now()
);

create index if not exists comments_post_idx on comments (post_id, created_at);

-- --------------------------------------------------------------------- issues
-- The admin "needs attention" queue produced by the Excel import
create table if not exists issues (
  id           text primary key,
  household_id text references households (id) on delete cascade,
  person_id    text references people (id) on delete cascade,
  field        text not null default '',
  kind         text not null default '',
  message      text not null default '',
  raw          text default '',
  resolved     boolean not null default false
);

create index if not exists issues_open_idx on issues (resolved, kind);

-- ----------------------------------------------------------------- change log
-- Powers the admin recent-changes feed and one-click undo
create table if not exists change_log (
  id       text primary key,
  at       timestamptz not null default now(),
  by_email text,
  by_name  text default '',
  action   text not null default '',
  target   text default '',
  before   jsonb,
  after    jsonb,
  undone   boolean not null default false
);

create index if not exists change_log_at_idx on change_log (at desc);

-- --------------------------------------------------------------------- admins
-- Committee members, matched on the email from their Google sign-in
create table if not exists admins (
  email      text primary key,
  added_at   timestamptz not null default now()
);

insert into admins (email) values
  ('anandjain0498@gmail.com')
  on conflict (email) do nothing;

-- ------------------------------------------------------------- keep timestamps
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists households_touch on households;
create trigger households_touch before update on households
  for each row execute function touch_updated_at();

drop trigger if exists people_touch on people;
create trigger people_touch before update on people
  for each row execute function touch_updated_at();

-- ------------------------------------------------------ lock everything down
-- RLS on, no policies: nothing is readable or writable with the public anon
-- key. The app's server connects with the service key and bypasses RLS after
-- doing its own permission checks.
alter table households enable row level security;
alter table people     enable row level security;
alter table posts      enable row level security;
alter table comments   enable row level security;
alter table issues     enable row level security;
alter table change_log enable row level security;
alter table admins     enable row level security;

-- ------------------------------------------------------------- photo storage
-- Member photos live in a private bucket, not in the database
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
