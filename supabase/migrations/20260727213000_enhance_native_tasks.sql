alter table public.tasks
  add column if not exists labels text[] not null default '{}';

create index if not exists tasks_labels_idx on public.tasks using gin(labels);

