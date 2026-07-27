create table if not exists public.task_columns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.task_columns(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  assignee text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_column_position_idx on public.tasks(column_id, position);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

drop trigger if exists task_columns_set_updated_at on public.task_columns;
create trigger task_columns_set_updated_at before update on public.task_columns
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.task_columns enable row level security;
alter table public.tasks enable row level security;

revoke all on public.task_columns from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
grant all on public.task_columns to service_role;
grant all on public.tasks to service_role;

insert into public.task_columns (title, position)
select seed.title, seed.position
from (values ('A fazer', 0), ('Em andamento', 1), ('Concluído', 2)) as seed(title, position)
where not exists (select 1 from public.task_columns);
