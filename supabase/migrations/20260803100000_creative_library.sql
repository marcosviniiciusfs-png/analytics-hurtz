create table if not exists public.creative_videos (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'tiktok' check (platform in ('tiktok','instagram','other')),
  video_url text not null,
  creator_url text,
  thumbnail_url text,
  title text,
  creator_name text,
  search_term text,
  product text,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_url)
);

create index if not exists creative_videos_created_at_idx on public.creative_videos (created_at desc);
create index if not exists creative_videos_search_term_idx on public.creative_videos (search_term);
alter table public.creative_videos enable row level security;

comment on table public.creative_videos is 'Referências públicas de criativos salvas pela extensão Hurtz; não armazena o arquivo do vídeo.';
