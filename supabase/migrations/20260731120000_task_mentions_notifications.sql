create table if not exists public.task_notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 100),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (task_id, recipient_name)
);

create index if not exists task_notifications_recipient_idx
  on public.task_notifications(recipient_name, is_read, created_at desc);

alter table public.task_notifications enable row level security;
revoke all on public.task_notifications from anon, authenticated;
grant all on public.task_notifications to service_role;
