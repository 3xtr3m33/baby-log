-- Схема базы для «Дневника ухода».
-- Выполняется один раз: Supabase → SQL Editor → New query → вставить целиком → Run.

create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key,
  family_id uuid not null references public.families on delete cascade,
  type text not null check (type in ('feed','diaper','sleep')),
  started_at timestamptz not null,
  ended_at timestamptz,
  kind text,
  side text check (side in ('left','right','both')),
  amount integer check (amount >= 0 and amount <= 1000),
  note text,
  by_name text,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Если таблица уже создана прежней версией схемы — догоняем колонки.
alter table public.events add column if not exists side text;
alter table public.events add column if not exists amount integer;
alter table public.events add column if not exists note text;

create index events_family_time on public.events (family_id, started_at desc);
create index events_family_updated on public.events (family_id, updated_at desc);

alter table public.families enable row level security;
alter table public.members  enable row level security;
alter table public.events   enable row level security;

-- какая семья у текущего пользователя
create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.members where user_id = auth.uid();
$$;

create policy members_self  on public.members  for select using (user_id = auth.uid());
create policy families_mine on public.families for select using (id = public.my_family());
create policy events_rw     on public.events   for all
  using (family_id = public.my_family())
  with check (family_id = public.my_family());

-- создать семью, вернуть код приглашения
create or replace function public.create_family(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_id uuid;
begin
  if public.my_family() is not null then
    return (select invite_code from public.families where id = public.my_family());
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.families(invite_code) values (v_code) returning id into v_id;
  insert into public.members(user_id, family_id, name) values (auth.uid(), v_id, p_name);
  return v_code;
end $$;

-- войти в существующую семью по коду
create or replace function public.join_family(p_code text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.families where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'INVALID_CODE'; end if;
  insert into public.members(user_id, family_id, name) values (auth.uid(), v_id, p_name)
  on conflict (user_id) do update set family_id = v_id, name = p_name;
end $$;

-- время последнего изменения ставит сервер, а не клиент
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger events_touch before update on public.events
for each row execute function public.touch_updated_at();

grant execute on function public.my_family(), public.create_family(text), public.join_family(text,text) to authenticated;

alter publication supabase_realtime add table public.events;

-- ── График кормлений (22.10.2026) ───────────────────────────────────────────
-- Общий на семью: { times: ["06:00", ...], toleranceMin, remindBeforeMin, updated_at }.
-- Прогнать этот блок отдельно, если основная схема уже стоит.
alter table public.families add column if not exists schedule jsonb;

-- Читать строку своей семьи уже разрешает политика families_mine выше.
create or replace function public.set_schedule(p_schedule jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_family() is null then raise exception 'NO_FAMILY'; end if;
  update public.families set schedule = p_schedule where id = public.my_family();
end $$;

grant execute on function public.set_schedule(jsonb) to authenticated;
