-- Nexus Office CRM — run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create type lead_status as enum (
  'new',
  'contacted',
  'replied',
  'qualified',
  'handed_off',
  'won',
  'lost'
);

create type lead_source as enum (
  'website_form',
  'manual',
  'csv_import',
  'marketing_agent',
  'referral',
  'other'
);

create type approval_status as enum ('pending', 'approved', 'rejected', 'sent');

create type message_direction as enum ('outbound', 'inbound', 'internal');

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  company text,
  website text,
  city text,
  country text default 'MX',
  locale text default 'es' check (locale in ('es', 'en')),
  source lead_source not null default 'manual',
  status lead_status not null default 'new',
  score integer not null default 0 check (score >= 0 and score <= 100),
  niche text,
  notes text,
  qualification jsonb default '{}'::jsonb,
  assigned_to text default 'sales_agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on leads (status);
create index if not exists leads_email_idx on leads (email);
create index if not exists leads_created_at_idx on leads (created_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  direction message_direction not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  agent text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_lead_id_idx on messages (lead_id, created_at);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  message_id uuid references messages (id) on delete set null,
  status approval_status not null default 'pending',
  kind text not null default 'email',
  subject text not null,
  body text not null,
  to_email text not null,
  from_email text,
  agent text not null default 'sales_agent',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists approvals_status_idx on approvals (status, created_at desc);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  city text,
  country text default 'MX',
  locale text default 'es',
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_events (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  event_type text not null,
  lead_id uuid references leads (id) on delete set null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

alter table leads enable row level security;
alter table messages enable row level security;
alter table approvals enable row level security;
alter table campaigns enable row level security;
alter table agent_events enable row level security;

-- Service role bypasses RLS. For anon webhook inserts, add a restricted policy later.
