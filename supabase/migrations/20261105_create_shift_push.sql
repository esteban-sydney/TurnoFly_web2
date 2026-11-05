create table if not exists public.shift_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shift_push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.shift_push_subscriptions(id) on delete cascade,
  worker_id text not null default '',
  reminder_key text not null,
  due_at timestamptz not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  locked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, reminder_key)
);

create index if not exists shift_push_reminders_due_idx
  on public.shift_push_reminders (due_at)
  where status = 'pending';

create index if not exists shift_push_reminders_stale_idx
  on public.shift_push_reminders (locked_at)
  where status = 'sending';

alter table public.shift_push_subscriptions enable row level security;
alter table public.shift_push_reminders enable row level security;
revoke all on public.shift_push_subscriptions, public.shift_push_reminders from anon, authenticated;
grant all on public.shift_push_subscriptions, public.shift_push_reminders to service_role;

create or replace function public.replace_shift_push_schedule(
  p_user_id uuid,
  p_subscription_id uuid,
  p_worker_id text,
  p_reminders jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.shift_push_subscriptions
    where id = p_subscription_id and user_id = p_user_id
  ) then
    raise exception 'Push subscription does not belong to the user';
  end if;

  delete from public.shift_push_reminders
  where subscription_id = p_subscription_id and user_id = p_user_id;

  insert into public.shift_push_reminders (
    user_id, subscription_id, worker_id, reminder_key, due_at, payload
  )
  select
    p_user_id,
    p_subscription_id,
    left(coalesce(p_worker_id, ''), 200),
    item.reminder_key,
    item.due_at,
    item.payload
  from jsonb_to_recordset(coalesce(p_reminders, '[]'::jsonb)) as item(
    reminder_key text,
    due_at timestamptz,
    payload jsonb
  )
  where item.reminder_key is not null
    and item.due_at > now()
    and item.payload is not null;
end;
$$;

create or replace function public.claim_due_shift_push_reminders(p_limit integer default 25)
returns table (
  id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_key text,
  payload jsonb,
  attempts integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select reminder.id
    from public.shift_push_reminders as reminder
    where (reminder.status = 'pending' and reminder.due_at <= now())
       or (reminder.status = 'sending' and reminder.locked_at < now() - interval '5 minutes')
    order by reminder.due_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ), claimed as (
    update public.shift_push_reminders as reminder
    set status = 'sending',
        attempts = reminder.attempts + 1,
        locked_at = now()
    from candidates
    where reminder.id = candidates.id
    returning reminder.id, reminder.subscription_id, reminder.payload, reminder.attempts
  )
  select claimed.id, claimed.subscription_id, subscription.endpoint,
         subscription.p256dh, subscription.auth_key, claimed.payload, claimed.attempts
  from claimed
  join public.shift_push_subscriptions as subscription
    on subscription.id = claimed.subscription_id;
end;
$$;

create or replace function public.finish_shift_push_reminder(
  p_reminder_id uuid,
  p_delivered boolean,
  p_retry boolean
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.shift_push_reminders
  set status = case when p_delivered then 'sent' when p_retry then 'pending' else 'failed' end,
      due_at = case when p_retry and not p_delivered then now() + interval '2 minutes' else due_at end,
      locked_at = null,
      sent_at = case when p_delivered then now() else sent_at end
  where id = p_reminder_id and status = 'sending';
$$;

revoke all on function public.replace_shift_push_schedule(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_due_shift_push_reminders(integer) from public, anon, authenticated;
revoke all on function public.finish_shift_push_reminder(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.replace_shift_push_schedule(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.claim_due_shift_push_reminders(integer) to service_role;
grant execute on function public.finish_shift_push_reminder(uuid, boolean, boolean) to service_role;
