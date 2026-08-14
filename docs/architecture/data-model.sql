-- Future server-side schema. The initial static release does not need this database.

create table users (
  id uuid primary key,
  username text unique not null,
  created_at timestamptz not null default now()
);

create table tracks (
  id text primary key,
  slug text unique not null,
  title text not null,
  version integer not null default 1,
  published boolean not null default false
);

create table lessons (
  id text primary key,
  track_id text not null references tracks(id),
  chapter_id text not null,
  position integer not null,
  title text not null,
  xp integer not null default 0,
  content_version integer not null default 1
);

create table lesson_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id),
  lesson_id text not null references lessons(id),
  submitted_at timestamptz not null default now(),
  passed boolean not null,
  runtime_ms integer,
  result_json jsonb not null default '{}'::jsonb
);

create table lesson_completions (
  user_id uuid not null references users(id),
  lesson_id text not null references lessons(id),
  completed_at timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (user_id, lesson_id)
);

create table xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id),
  event_key text not null,
  source_type text not null,
  source_id text not null,
  amount integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_key, source_type, source_id)
);

create table notes (
  id uuid primary key,
  user_id uuid not null references users(id),
  lesson_id text,
  title text not null,
  body text not null default '',
  code_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
