alter table public.tasks
  add column if not exists expires_at timestamptz;

update public.tasks
set expires_at = created_at + interval '72 hours'
where expires_at is null;

alter table public.tasks
  alter column expires_at set default (now() + interval '72 hours'),
  alter column expires_at set not null;

create index if not exists tasks_expires_at_idx on public.tasks(expires_at);

