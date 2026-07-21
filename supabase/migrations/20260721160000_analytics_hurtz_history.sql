create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ad_accounts (
  id text primary key check (id ~ '^act_[0-9]+$'),
  name text not null,
  business_id text,
  business_name text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  meta_status text,
  is_monitored boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitoring_plans (
  account_id text primary key references public.ad_accounts(id) on delete cascade,
  payment_type text not null default 'prepaid' check (payment_type in ('prepaid','credit')),
  deposit_amount numeric(14,2) not null default 0 check (deposit_amount >= 0),
  deposit_at timestamptz,
  planned_days integer not null default 1 check (planned_days between 1 and 366),
  daily_limit numeric(14,2) not null default 0 check (daily_limit >= 0),
  weekly_limit numeric(14,2) not null default 0 check (weekly_limit >= 0),
  week_start_day smallint not null default 1 check (week_start_day in (0,1)),
  fee_rate numeric(7,6) not null default 0.121500 check (fee_rate between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payment_type = 'prepaid' and deposit_amount >= 0)
    or
    (payment_type = 'credit' and daily_limit > 0 and weekly_limit > 0)
  )
);

create table if not exists public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  window_type text not null check (window_type in ('today','yesterday','custom','90d','cycle_reset')),
  date_from date not null,
  date_to date not null,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'running' check (status in ('running','reconciled','failed','partial')),
  requested_accounts integer not null default 0,
  reconciled_accounts integer not null default 0,
  source text not null default 'meta_marketing_api',
  payload_sha256 text,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (date_to >= date_from)
);

create table if not exists public.account_daily_metrics (
  account_id text not null references public.ad_accounts(id) on delete cascade,
  metric_date date not null,
  audit_run_id uuid references public.audit_runs(id) on delete set null,
  spend numeric(14,2) not null default 0 check (spend >= 0),
  campaign_sum numeric(14,2) not null default 0 check (campaign_sum >= 0),
  results numeric(14,2),
  result_type text,
  impressions bigint,
  reach bigint,
  clicks bigint,
  ctr numeric(12,6),
  cpm numeric(14,6),
  cpc numeric(14,6),
  active_campaign_count integer not null default 0,
  spend_reconciled boolean not null default false,
  result_reconciled boolean not null default false,
  is_provisional boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, metric_date)
);

create table if not exists public.campaign_daily_metrics (
  account_id text not null references public.ad_accounts(id) on delete cascade,
  campaign_id text not null,
  metric_date date not null,
  audit_run_id uuid references public.audit_runs(id) on delete set null,
  campaign_name text not null,
  objective text,
  objective_label text,
  effective_status text,
  result_type text,
  spend numeric(14,2) not null default 0 check (spend >= 0),
  results numeric(14,2),
  cost_per_result numeric(14,6),
  impressions bigint,
  reach bigint,
  clicks bigint,
  ctr numeric(12,6),
  cpm numeric(14,6),
  cpc numeric(14,6),
  spend_reconciled boolean not null default false,
  result_reconciled boolean not null default false,
  is_provisional boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, campaign_id, metric_date)
);

create table if not exists public.cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.ad_accounts(id) on delete cascade,
  cycle_started_at timestamptz not null,
  cycle_ends_at timestamptz not null,
  baseline_spend numeric(14,2) not null default 0,
  current_spend numeric(14,2) not null default 0,
  weekly_limit numeric(14,2) not null default 0,
  reset_rule text not null check (reset_rule in ('monday_0005','sunday_2355')),
  is_provisional boolean not null default true,
  recorded_at timestamptz not null default now(),
  unique (account_id, cycle_started_at),
  check (cycle_ends_at > cycle_started_at)
);

create index if not exists account_daily_metrics_date_idx on public.account_daily_metrics(metric_date desc);
create index if not exists campaign_daily_metrics_date_idx on public.campaign_daily_metrics(metric_date desc);
create index if not exists campaign_daily_metrics_campaign_idx on public.campaign_daily_metrics(campaign_id, metric_date desc);
create index if not exists audit_runs_period_idx on public.audit_runs(date_from desc, date_to desc);
create index if not exists cycle_snapshots_account_idx on public.cycle_snapshots(account_id, cycle_started_at desc);

drop trigger if exists ad_accounts_updated_at on public.ad_accounts;
create trigger ad_accounts_updated_at before update on public.ad_accounts for each row execute function public.set_updated_at();
drop trigger if exists monitoring_plans_updated_at on public.monitoring_plans;
create trigger monitoring_plans_updated_at before update on public.monitoring_plans for each row execute function public.set_updated_at();
drop trigger if exists account_daily_metrics_updated_at on public.account_daily_metrics;
create trigger account_daily_metrics_updated_at before update on public.account_daily_metrics for each row execute function public.set_updated_at();
drop trigger if exists campaign_daily_metrics_updated_at on public.campaign_daily_metrics;
create trigger campaign_daily_metrics_updated_at before update on public.campaign_daily_metrics for each row execute function public.set_updated_at();

alter table public.ad_accounts enable row level security;
alter table public.monitoring_plans enable row level security;
alter table public.audit_runs enable row level security;
alter table public.account_daily_metrics enable row level security;
alter table public.campaign_daily_metrics enable row level security;
alter table public.cycle_snapshots enable row level security;

revoke all on public.ad_accounts from anon, authenticated;
revoke all on public.monitoring_plans from anon, authenticated;
revoke all on public.audit_runs from anon, authenticated;
revoke all on public.account_daily_metrics from anon, authenticated;
revoke all on public.campaign_daily_metrics from anon, authenticated;
revoke all on public.cycle_snapshots from anon, authenticated;

grant all on public.ad_accounts to service_role;
grant all on public.monitoring_plans to service_role;
grant all on public.audit_runs to service_role;
grant all on public.account_daily_metrics to service_role;
grant all on public.campaign_daily_metrics to service_role;
grant all on public.cycle_snapshots to service_role;

comment on table public.account_daily_metrics is 'Snapshots diários reconciliados da conta vindos da Meta Marketing API.';
comment on table public.campaign_daily_metrics is 'Snapshots diários de campanhas, incluindo campanhas pausadas que tiveram veiculação.';
comment on table public.cycle_snapshots is 'Marcos operacionais dos ciclos semanais de contas em cartão; histórico nunca é apagado.';
