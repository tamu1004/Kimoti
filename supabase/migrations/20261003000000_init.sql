-- Kimoti MVP schema, RLS, and RPCs
-- Apply in the Supabase SQL editor (Tokyo / ap-northeast-1) or via supabase db push.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '',
  created_at timestamptz not null default now(),
  constraint profiles_nickname_len check (char_length(nickname) <= 12)
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sharing_paused boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  constraint couple_members_one_couple unique (user_id)
);

create table if not exists public.invites (
  code text primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.current_signals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  preset text not null,
  mood text not null,
  availability text not null,
  cause text,
  request_tags text[] not null default '{}',
  note text,
  revisit_at timestamptz,
  expires_at timestamptz not null,
  extend_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint current_signals_note_len check (note is null or char_length(note) <= 40)
);

create table if not exists public.signal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  couple_id uuid not null,
  preset text not null,
  mood text not null,
  availability text not null,
  cause text,
  request_tags text[] not null default '{}',
  note text,
  revisit_at timestamptz,
  expires_at timestamptz not null,
  extend_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('ok', 'waiting', 'take_your_time')),
  target_updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists couple_members_couple_id_idx on public.couple_members (couple_id);
create index if not exists current_signals_couple_id_idx on public.current_signals (couple_id);
create index if not exists signal_logs_user_id_created_idx on public.signal_logs (user_id, created_at desc);
create index if not exists reactions_to_user_idx on public.reactions (to_user_id, created_at desc);
create index if not exists reactions_couple_idx on public.reactions (couple_id);

alter table public.current_signals replica identity full;
alter table public.reactions replica identity full;
alter table public.couple_members replica identity full;

-- ---------------------------------------------------------------------------
-- Helpers (security definer, avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_same_couple(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members mine
    join public.couple_members theirs
      on mine.couple_id = theirs.couple_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id
  from public.couple_members
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.partner_sharing_paused(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select sharing_paused
      from public.couple_members
      where user_id = target_user_id
      limit 1
    ),
    true
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, '')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- History snapshot on every current_signals write
create or replace function public.log_current_signal()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.signal_logs (
    user_id, couple_id, preset, mood, availability, cause,
    request_tags, note, revisit_at, expires_at, extend_count
  ) values (
    new.user_id, new.couple_id, new.preset, new.mood, new.availability, new.cause,
    new.request_tags, new.note, new.revisit_at, new.expires_at, new.extend_count
  );
  return new;
end;
$$;

drop trigger if exists on_current_signal_written on public.current_signals;
create trigger on_current_signal_written
  after insert or update on public.current_signals
  for each row execute function public.log_current_signal();

create or replace function public.protect_couple_members()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.couple_id is distinct from old.couple_id
      or new.user_id is distinct from old.user_id
      or new.joined_at is distinct from old.joined_at then
      raise exception 'membership fields cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists couple_members_protect on public.couple_members;
create trigger couple_members_protect
  before update on public.couple_members
  for each row execute function public.protect_couple_members();

create or replace function public.ensure_signal_own_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid;
begin
  select couple_id into v_couple
  from public.couple_members
  where user_id = new.user_id;
  if v_couple is null or v_couple is distinct from new.couple_id then
    raise exception 'signal couple mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists current_signals_couple_check on public.current_signals;
create trigger current_signals_couple_check
  before insert or update on public.current_signals
  for each row execute function public.ensure_signal_own_couple();

-- ---------------------------------------------------------------------------
-- Invite code helper
-- ---------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.invites where code = result);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_member_count int;
  v_code text;
  v_existing text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_uid;

  if v_couple_id is null then
    insert into public.couples default values
    returning id into v_couple_id;
    insert into public.couple_members (couple_id, user_id)
    values (v_couple_id, v_uid);
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception 'couple is full';
  end if;

  select code into v_existing
  from public.invites
  where couple_id = v_couple_id
    and used_at is null
    and expires_at > now()
  order by expires_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_code := public.generate_invite_code();
  insert into public.invites (code, couple_id, created_by, expires_at)
  values (v_code, v_couple_id, v_uid, now() + interval '24 hours');
  return v_code;
end;
$$;

create or replace function public.join_couple(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.invites%rowtype;
  v_count int;
  v_normalized text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_normalized := upper(trim(code));

  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'already paired';
  end if;

  select * into v_invite
  from public.invites
  where invites.code = v_normalized
  for update;

  if not found then
    raise exception 'invalid code';
  end if;

  if v_invite.used_at is not null then
    raise exception 'code already used';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'code expired';
  end if;

  if v_invite.created_by = v_uid then
    raise exception 'cannot join own invite';
  end if;

  select count(*) into v_count
  from public.couple_members
  where couple_id = v_invite.couple_id;

  if v_count >= 2 then
    raise exception 'couple is full';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (v_invite.couple_id, v_uid);

  update public.invites
  set used_at = now()
  where invites.code = v_invite.code;

  return v_invite.couple_id;
end;
$$;

create or replace function public.leave_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_uid;

  if v_couple_id is null then
    return;
  end if;

  delete from public.invites where couple_id = v_couple_id;
  delete from public.couple_members where couple_id = v_couple_id;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  perform public.leave_couple();

  delete from public.reactions
  where from_user_id = v_uid or to_user_id = v_uid;

  delete from public.current_signals where user_id = v_uid;
  delete from public.signal_logs where user_id = v_uid;
  delete from public.invites where created_by = v_uid;
  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.invites enable row level security;
alter table public.current_signals enable row level security;
alter table public.signal_logs enable row level security;
alter table public.reactions enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_same_couple(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples
  for select to authenticated
  using (id = public.my_couple_id());

drop policy if exists couple_members_select on public.couple_members;
create policy couple_members_select on public.couple_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_same_couple(user_id));

drop policy if exists couple_members_update on public.couple_members;
create policy couple_members_update on public.couple_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (created_by = auth.uid());

drop policy if exists current_signals_select on public.current_signals;
create policy current_signals_select on public.current_signals
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.is_same_couple(user_id)
      and public.partner_sharing_paused(user_id) = false
    )
  );

drop policy if exists current_signals_insert on public.current_signals;
create policy current_signals_insert on public.current_signals
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists current_signals_update on public.current_signals;
create policy current_signals_update on public.current_signals
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists signal_logs_select on public.signal_logs;
create policy signal_logs_select on public.signal_logs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists signal_logs_insert on public.signal_logs;
create policy signal_logs_insert on public.signal_logs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete to authenticated
  using (from_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.couples to authenticated;
grant select, update on public.couple_members to authenticated;
grant select on public.invites to authenticated;
grant select, insert, update on public.current_signals to authenticated;
grant select, insert on public.signal_logs to authenticated;
grant select, insert, delete on public.reactions to authenticated;

grant execute on function public.is_same_couple(uuid) to authenticated;
grant execute on function public.my_couple_id() to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.leave_couple() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.current_signals;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.reactions;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.couple_members;
  exception
    when duplicate_object then null;
  end;
end $$;
