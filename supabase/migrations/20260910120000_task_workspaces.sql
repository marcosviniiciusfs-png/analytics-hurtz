create table if not exists public.task_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id text not null unique check (public_id ~ '^HZ-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  owner_id uuid references auth.users(id) on delete restrict,
  is_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_workspace_members (
  workspace_id uuid not null references public.task_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.task_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.task_workspaces(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.task_columns add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_projects add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.tasks add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_notifications add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_notifications add column if not exists recipient_user_id uuid references auth.users(id) on delete cascade;
alter table public.task_subtasks add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_comments add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_attachments add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;
alter table public.task_activities add column if not exists workspace_id uuid references public.task_workspaces(id) on delete cascade;

do $$
declare legacy_id uuid;
begin
  select id into legacy_id from public.task_workspaces where is_legacy = true limit 1;
  if legacy_id is null then
    insert into public.task_workspaces (name, description, is_legacy)
    values ('Quadro Hurtz', 'Quadro migrado da versão anterior.', true)
    returning id into legacy_id;
  end if;
  update public.task_columns set workspace_id = legacy_id where workspace_id is null;
  update public.task_projects set workspace_id = legacy_id where workspace_id is null;
  update public.tasks t set workspace_id = c.workspace_id from public.task_columns c where t.column_id = c.id and t.workspace_id is null;
  update public.task_notifications n set workspace_id = t.workspace_id from public.tasks t where n.task_id = t.id and n.workspace_id is null;
  update public.task_subtasks s set workspace_id = t.workspace_id from public.tasks t where s.task_id = t.id and s.workspace_id is null;
  update public.task_comments c set workspace_id = t.workspace_id from public.tasks t where c.task_id = t.id and c.workspace_id is null;
  update public.task_attachments a set workspace_id = t.workspace_id from public.tasks t where a.task_id = t.id and a.workspace_id is null;
  update public.task_activities a set workspace_id = t.workspace_id from public.tasks t where a.task_id = t.id and a.workspace_id is null;
  update public.task_activities set workspace_id = legacy_id where workspace_id is null;
end $$;

alter table public.task_columns alter column workspace_id set not null;
alter table public.task_projects alter column workspace_id set not null;
alter table public.tasks alter column workspace_id set not null;
alter table public.task_subtasks alter column workspace_id set not null;
alter table public.task_comments alter column workspace_id set not null;
alter table public.task_attachments alter column workspace_id set not null;
alter table public.task_activities alter column workspace_id set not null;

alter table public.task_columns add constraint task_columns_id_workspace_unique unique (id, workspace_id);
alter table public.tasks add constraint tasks_id_workspace_unique unique (id, workspace_id);
alter table public.tasks drop constraint if exists tasks_column_workspace_fk;
alter table public.tasks add constraint tasks_column_workspace_fk foreign key (column_id, workspace_id) references public.task_columns(id, workspace_id);
alter table public.task_notifications drop constraint if exists task_notifications_task_workspace_fk;
alter table public.task_notifications add constraint task_notifications_task_workspace_fk foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade;
alter table public.task_subtasks drop constraint if exists task_subtasks_task_workspace_fk;
alter table public.task_subtasks add constraint task_subtasks_task_workspace_fk foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade;
alter table public.task_comments drop constraint if exists task_comments_task_workspace_fk;
alter table public.task_comments add constraint task_comments_task_workspace_fk foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade;
alter table public.task_attachments drop constraint if exists task_attachments_task_workspace_fk;
alter table public.task_attachments add constraint task_attachments_task_workspace_fk foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade;

create index if not exists task_columns_workspace_position_idx on public.task_columns(workspace_id, position);
create index if not exists tasks_workspace_position_idx on public.tasks(workspace_id, column_id, position);
create index if not exists task_projects_workspace_idx on public.task_projects(workspace_id);
create index if not exists task_workspace_members_user_idx on public.task_workspace_members(user_id, joined_at);
create index if not exists task_workspace_invites_user_idx on public.task_workspace_invites(invited_user_id, status, created_at desc);
create unique index if not exists task_workspace_invites_one_pending_idx on public.task_workspace_invites(workspace_id, invited_user_id) where status = 'pending';
create index if not exists task_subtasks_workspace_idx on public.task_subtasks(workspace_id, task_id);
create index if not exists task_comments_workspace_idx on public.task_comments(workspace_id, task_id);
create index if not exists task_attachments_workspace_idx on public.task_attachments(workspace_id, task_id);
create index if not exists task_activities_workspace_idx on public.task_activities(workspace_id, task_id);

drop trigger if exists task_user_profiles_set_updated_at on public.task_user_profiles;
create trigger task_user_profiles_set_updated_at before update on public.task_user_profiles for each row execute function public.set_updated_at();
drop trigger if exists task_workspaces_set_updated_at on public.task_workspaces;
create trigger task_workspaces_set_updated_at before update on public.task_workspaces for each row execute function public.set_updated_at();

alter table public.task_user_profiles enable row level security;
alter table public.task_workspaces enable row level security;
alter table public.task_workspace_members enable row level security;
alter table public.task_workspace_invites enable row level security;

revoke all on public.task_user_profiles, public.task_workspaces, public.task_workspace_members, public.task_workspace_invites from anon, authenticated;
grant all on public.task_user_profiles, public.task_workspaces, public.task_workspace_members, public.task_workspace_invites to service_role;
