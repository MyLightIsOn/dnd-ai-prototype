-- Run history
create table if not exists runs (
  id          uuid primary key default gen_random_uuid(),
  workflow    jsonb not null,
  name        text,
  created_at  timestamptz default now(),
  user_id     uuid references auth.users
);

-- One row per provider per run
create table if not exists run_outputs (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references runs on delete cascade,
  provider    text not null,
  output      jsonb not null,
  latency_ms  integer,
  tokens      jsonb,
  cost_usd    numeric(10,6),
  created_at  timestamptz default now()
);

-- Annotations per run per provider
create table if not exists annotations (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid references runs on delete cascade,
  provider    text,
  rating      smallint check (rating between 1 and 5),
  thumbs      boolean,
  notes       text,
  created_at  timestamptz default now()
);

-- Workflow templates
create table if not exists templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  workflow    jsonb not null,
  tags        text[],
  author      text,
  source      text check (source in ('bundled', 'community')),
  created_at  timestamptz default now()
);

-- Indexes for common queries
create index if not exists runs_created_at_idx on runs(created_at desc);
create index if not exists run_outputs_run_id_idx on run_outputs(run_id);
create index if not exists annotations_run_id_idx on annotations(run_id);
