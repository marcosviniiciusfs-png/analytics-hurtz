alter table public.task_columns
  add column if not exists role text not null default 'standard'
  check (role in ('standard', 'in_progress', 'review', 'blocked', 'completed'));

update public.task_columns
set role = case
  when lower(title) like '%conclu%' then 'completed'
  when lower(title) like '%revis%' then 'review'
  when lower(title) like '%bloque%' then 'blocked'
  when lower(title) like '%andamento%' or lower(title) like '%progresso%' then 'in_progress'
  else role
end
where role = 'standard';
