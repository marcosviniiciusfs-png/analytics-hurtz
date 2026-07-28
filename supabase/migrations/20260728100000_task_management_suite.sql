create table if not exists public.task_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  color text not null default '#ef7618',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.tasks
  add column if not exists project_id uuid references public.task_projects(id) on delete set null,
  add column if not exists module_id uuid references public.task_modules(id) on delete set null,
  add column if not exists cycle_id uuid references public.task_cycles(id) on delete set null,
  add column if not exists estimate_minutes integer check (estimate_minutes is null or estimate_minutes between 0 and 100000),
  add column if not exists completed_at timestamptz;

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author text not null default 'Equipe Hurtz',
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null default 0 check (size_bytes between 0 and 5242880),
  created_at timestamptz not null default now()
);

create table if not exists public.task_activities (
  id bigint generated always as identity primary key,
  task_id uuid references public.tasks(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  actor text not null default 'Equipe Hurtz',
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_module_idx on public.tasks(module_id);
create index if not exists tasks_cycle_idx on public.tasks(cycle_id);
create index if not exists task_subtasks_task_idx on public.task_subtasks(task_id, position);
create index if not exists task_comments_task_idx on public.task_comments(task_id, created_at);
create index if not exists task_attachments_task_idx on public.task_attachments(task_id, created_at);
create index if not exists task_activities_task_idx on public.task_activities(task_id, created_at desc);

drop trigger if exists task_projects_set_updated_at on public.task_projects;
create trigger task_projects_set_updated_at before update on public.task_projects for each row execute function public.set_updated_at();
drop trigger if exists task_modules_set_updated_at on public.task_modules;
create trigger task_modules_set_updated_at before update on public.task_modules for each row execute function public.set_updated_at();
drop trigger if exists task_cycles_set_updated_at on public.task_cycles;
create trigger task_cycles_set_updated_at before update on public.task_cycles for each row execute function public.set_updated_at();
drop trigger if exists task_subtasks_set_updated_at on public.task_subtasks;
create trigger task_subtasks_set_updated_at before update on public.task_subtasks for each row execute function public.set_updated_at();

alter table public.task_projects enable row level security;
alter table public.task_modules enable row level security;
alter table public.task_cycles enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_activities enable row level security;

revoke all on public.task_projects, public.task_modules, public.task_cycles, public.task_subtasks, public.task_comments, public.task_attachments, public.task_activities from anon, authenticated;
grant all on public.task_projects, public.task_modules, public.task_cycles, public.task_subtasks, public.task_comments, public.task_attachments, public.task_activities to service_role;
grant usage, select on sequence public.task_activities_id_seq to service_role;

insert into public.task_projects (title, color)
select 'Operação Hurtz', '#ef7618'
where not exists (select 1 from public.task_projects);

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 5242880)
on conflict (id) do update set public=false, file_size_limit=5242880;

