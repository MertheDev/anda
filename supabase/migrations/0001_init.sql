-- Anda: initial schema. Row Level Security is enabled on every table; nothing is readable or
-- writable unless a policy below allows it. Client-side checks are convenience only.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  role text not null default 'traveler' check (role in ('traveler', 'business')),
  locale text not null default 'en' check (locale in ('tr', 'en')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are readable" on public.profiles
  for select to anon, authenticated using (true);
create policy "users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users may change only these columns; `role` is changed by admins (service role) only.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text;
begin
  name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), '')), 40);
  if char_length(name) < 2 then name := 'Anda user'; end if;
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    name,
    case when new.raw_user_meta_data ->> 'locale' = 'tr' then 'tr' else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  category text not null check (category in ('music', 'food', 'nightlife', 'sports', 'art', 'community', 'other')),
  location extensions.geography(Point, 4326) not null,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.businesses enable row level security;

create policy "verified businesses are public, owners see their own" on public.businesses
  for select to anon, authenticated
  using (verification_status = 'verified' or owner_id = auth.uid());
create policy "users register their own business as pending" on public.businesses
  for insert to authenticated
  with check (owner_id = auth.uid() and verification_status = 'pending');
create policy "owners edit their business" on public.businesses
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke update on public.businesses from authenticated;
grant update (name, category, location) on public.businesses to authenticated;

-- ---------------------------------------------------------------------------
-- blocks (declared before events so the events policy can reference it)
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

create policy "users read their own blocks" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "users block others" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "users unblock" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('user', 'business')),
  host_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (category in ('music', 'food', 'nightlife', 'sports', 'art', 'community', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location extensions.geography(Point, 4326) not null,
  venue_name text not null check (char_length(venue_name) between 2 and 120),
  city text check (city is null or char_length(city) <= 80),
  price_cents integer not null default 0 check (price_cents between 0 and 1000000),
  currency text not null default 'TRY' check (currency in ('TRY', 'EUR')),
  capacity integer check (capacity is null or capacity between 2 and 10000),
  ticket_url text check (ticket_url is null or (char_length(ticket_url) <= 500 and ticket_url ~ '^https://')),
  status text not null default 'published' check (status in ('published', 'hidden', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '3 days'),
  check ((type = 'business') = (business_id is not null))
);
create index events_location_idx on public.events using gist (location);
create index events_starts_at_idx on public.events (starts_at);
create index events_host_idx on public.events (host_id);
alter table public.events enable row level security;

create policy "published events are visible unless blocked" on public.events
  for select to anon, authenticated
  using (
    status = 'published'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = events.host_id)
         or (b.blocker_id = events.host_id and b.blocked_id = auth.uid())
    )
  );

create policy "hosts see all of their own events" on public.events
  for select to authenticated using (host_id = auth.uid());

create policy "users publish plans, verified businesses publish events" on public.events
  for insert to authenticated
  with check (
    host_id = auth.uid()
    and status = 'published'
    and (
      (type = 'user' and business_id is null)
      or (
        type = 'business'
        and exists (
          select 1 from public.businesses b
          where b.id = business_id and b.owner_id = auth.uid() and b.verification_status = 'verified'
        )
      )
    )
  );

-- Hosts may edit or cancel their own published events; hidden events (moderation) stay locked.
create policy "hosts edit their published events" on public.events
  for update to authenticated
  using (host_id = auth.uid() and status = 'published')
  with check (host_id = auth.uid() and status in ('published', 'cancelled'));

revoke update on public.events from authenticated;
grant update (title, category, starts_at, ends_at, venue_name, price_cents, capacity, ticket_url, status)
  on public.events to authenticated;

-- Rate limit: at most 10 events per host per 24 hours.
create function public.enforce_event_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.events where host_id = new.host_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'event_rate_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger events_rate_limit before insert on public.events
  for each row execute function public.enforce_event_rate_limit();

-- ---------------------------------------------------------------------------
-- attendees: written only through join_event / leave_event
-- ---------------------------------------------------------------------------
create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendees_user_idx on public.event_attendees (user_id);
alter table public.event_attendees enable row level security;

create policy "attendees of visible events are readable" on public.event_attendees
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

revoke insert, update, delete on public.event_attendees from authenticated, anon;

create function public.join_event(p_event_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  ev public.events%rowtype;
  taken integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' or ev.ends_at <= now() then
    raise exception 'event_unavailable' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = ev.host_id and b.blocked_id = auth.uid())
       or (b.blocker_id = auth.uid() and b.blocked_id = ev.host_id)
  ) then
    raise exception 'event_unavailable' using errcode = 'P0002';
  end if;

  select count(*) into taken from public.event_attendees where event_id = p_event_id;
  if ev.capacity is not null and taken >= ev.capacity
     and not exists (select 1 from public.event_attendees where event_id = p_event_id and user_id = auth.uid()) then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  insert into public.event_attendees (event_id, user_id) values (p_event_id, auth.uid())
  on conflict do nothing;

  return (select count(*) from public.event_attendees where event_id = p_event_id)::integer;
end;
$$;

create function public.leave_event(p_event_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from public.event_attendees where event_id = p_event_id and user_id = auth.uid();
  return (select count(*) from public.event_attendees where event_id = p_event_id)::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- map feed and event creation (RLS applies: functions run as the caller)
-- ---------------------------------------------------------------------------
create function public.events_feed(
  p_west double precision, p_south double precision, p_east double precision, p_north double precision
) returns table (
  id uuid, type text, category text, title text, host_name text, venue_name text, city text,
  lng double precision, lat double precision, starts_at timestamptz, ends_at timestamptz,
  price_cents integer, currency text, capacity integer, ticket_url text,
  attendee_count integer, joined boolean, attendees jsonb
)
language sql stable set search_path = public, extensions as $$
  select
    e.id, e.type, e.category, e.title,
    coalesce(bz.name, hp.display_name) as host_name,
    e.venue_name, e.city,
    st_x(e.location::geometry), st_y(e.location::geometry),
    e.starts_at, e.ends_at, e.price_cents, e.currency, e.capacity, e.ticket_url,
    (select count(*)::integer from public.event_attendees a where a.event_id = e.id),
    exists (select 1 from public.event_attendees a where a.event_id = e.id and a.user_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'avatarUrl', p.avatar_url))
      from (
        select p2.id, p2.display_name, p2.avatar_url
        from public.event_attendees a join public.profiles p2 on p2.id = a.user_id
        where a.event_id = e.id order by a.created_at limit 5
      ) p
    ), '[]'::jsonb)
  from public.events e
  join public.profiles hp on hp.id = e.host_id
  left join public.businesses bz on bz.id = e.business_id
  where e.ends_at > now()
    and e.starts_at < now() + interval '60 days'
    and e.location && st_makeenvelope(p_west, p_south, p_east, p_north, 4326)::geography
  order by e.starts_at
  limit 500;
$$;

create function public.create_event(
  p_title text, p_category text, p_venue_name text, p_city text,
  p_lng double precision, p_lat double precision,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_price_cents integer, p_capacity integer, p_ticket_url text
) returns uuid
language plpgsql set search_path = public, extensions as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_lng not between -31 and 45 or p_lat not between 34 and 72 then
    raise exception 'out_of_area' using errcode = 'P0001';
  end if;

  insert into public.events (
    type, host_id, title, category, venue_name, city, location,
    starts_at, ends_at, price_cents, capacity, ticket_url
  ) values (
    'user', auth.uid(), trim(p_title), p_category, trim(p_venue_name), nullif(trim(p_city), ''),
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_starts_at, p_ends_at, p_price_cents, p_capacity, nullif(trim(p_ticket_url), '')
  ) returning id into new_id;

  return new_id;
end;
$$;

-- The host is automatically going. Done in a definer trigger because clients cannot write attendees.
create function public.add_host_as_attendee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_attendees (event_id, user_id) values (new.id, new.host_id)
  on conflict do nothing;
  return new;
end;
$$;
create trigger events_add_host after insert on public.events
  for each row execute function public.add_host_as_attendee();

-- ---------------------------------------------------------------------------
-- chat (participants only; no direct messages)
-- ---------------------------------------------------------------------------
create table public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index event_messages_event_idx on public.event_messages (event_id, created_at);
alter table public.event_messages enable row level security;

create policy "participants read the chat" on public.event_messages
  for select to authenticated
  using (exists (select 1 from public.event_attendees a where a.event_id = event_messages.event_id and a.user_id = auth.uid()));
create policy "participants write in the chat" on public.event_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.event_attendees a where a.event_id = event_messages.event_id and a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- follows, saves, reports
-- ---------------------------------------------------------------------------
create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
alter table public.follows enable row level security;
create policy "users manage their follows" on public.follows
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.saves enable row level security;
create policy "users manage their saves" on public.saves
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('event', 'user', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
-- Reporters can file reports but never read them back; the admin panel uses the service role.
create policy "users file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- account deletion (store requirement); cascades through profiles to everything above
-- ---------------------------------------------------------------------------
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- function privileges: nothing is callable by default
-- ---------------------------------------------------------------------------
revoke all on function public.join_event(uuid), public.leave_event(uuid), public.delete_my_account(),
  public.create_event(text, text, text, text, double precision, double precision, timestamptz, timestamptz, integer, integer, text),
  public.events_feed(double precision, double precision, double precision, double precision),
  public.handle_new_user(), public.enforce_event_rate_limit(), public.add_host_as_attendee()
  from public, anon, authenticated;

grant execute on function public.join_event(uuid), public.leave_event(uuid), public.delete_my_account(),
  public.create_event(text, text, text, text, double precision, double precision, timestamptz, timestamptz, integer, integer, text)
  to authenticated;
grant execute on function public.events_feed(double precision, double precision, double precision, double precision)
  to anon, authenticated;
