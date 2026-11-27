-- Wesync · ويسي على واتساب (v1) — 2026-11-26
-- • جدول ربط رقم الواتساب بالحساب (كل عضو يربط رقمه بنفسه برسالة «ربط CODE» من جواله)
-- • سجل الرسائل (لمنع التكرار، ولقياس الاستخدام الأسبوعي الحقيقي)
-- • دوال للواجهة: كود الربط، الإعدادات، فك الربط
-- • جدولة: كل ساعة الدالة whatsapp-bot ترسل «مهامكم اليوم» للي ساعتهم المختارة حانت
-- ما يحذف ولا يعدّل أي بيانات موجودة. آمن لتشغيله أكثر من مرة.

create table if not exists public.whatsapp_links (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  phone text unique,
  link_code text unique,
  code_expires_at timestamptz,
  linked_at timestamptz,
  paused boolean not null default false,
  morning_hour smallint not null default 8 check (morning_hour between 5 and 12),
  last_list jsonb not null default '[]'::jsonb,
  last_inbound_at timestamptz,
  last_morning_on date,
  created_at timestamptz not null default now()
);
alter table public.whatsapp_links enable row level security;
drop policy if exists "own whatsapp link" on public.whatsapp_links;
create policy "own whatsapp link" on public.whatsapp_links
  for select to authenticated using (profile_id = (select auth.uid()));
-- الكتابة بس عبر الدوال تحت أو عبر الدالة whatsapp-bot (service role)

create table if not exists public.whatsapp_messages (
  id bigserial primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  direction text not null check (direction in ('in', 'out')),
  wa_id text unique,
  kind text,
  body text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_profile_idx on public.whatsapp_messages (profile_id, created_at desc);
alter table public.whatsapp_messages enable row level security;
-- بدون سياسات: الطلاب ما يقرون السجل، بس الدالة (service role) ولوحة الأدمن

-- كود ربط جديد (صالح ٣٠ دقيقة) — العضو يرسله لرقم ويسي من جواله فيثبت إن الرقم رقمه
create or replace function public.whatsapp_link_code()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.whatsapp_links where link_code = v_code);
  end loop;
  insert into public.whatsapp_links (profile_id, team_id, link_code, code_expires_at)
  values (v_uid, public.my_team_id(), v_code, now() + interval '30 minutes')
  on conflict (profile_id) do update
    set link_code = excluded.link_code, code_expires_at = excluded.code_expires_at, team_id = excluded.team_id;
  return v_code;
end;
$$;

create or replace function public.whatsapp_set_prefs(p_paused boolean, p_hour integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update public.whatsapp_links
    set paused = coalesce(p_paused, paused),
        morning_hour = least(greatest(coalesce(p_hour, morning_hour), 5), 12)
    where profile_id = auth.uid();
end;
$$;

create or replace function public.whatsapp_unlink()
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from public.whatsapp_links where profile_id = auth.uid();
$$;

revoke execute on function public.whatsapp_link_code() from public, anon;
revoke execute on function public.whatsapp_set_prefs(boolean, integer) from public, anon;
revoke execute on function public.whatsapp_unlink() from public, anon;
grant execute on function public.whatsapp_link_code() to authenticated;
grant execute on function public.whatsapp_set_prefs(boolean, integer) to authenticated;
grant execute on function public.whatsapp_unlink() to authenticated;

-- كل ساعة (الدقيقة 3): الدالة تشيك مين ساعته حانت بتوقيت الرياض وترسل له — نفس سر الجدولة حق الإيميلات
do $$
begin
  if exists (select 1 from cron.job where jobname = 'whatsapp-morning') then
    perform cron.unschedule('whatsapp-morning');
  end if;
  perform cron.schedule(
    'whatsapp-morning',
    '3 * * * *',
    $cron$
      select net.http_post(
        url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/whatsapp-bot',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
        ),
        body := '{"action":"morning"}'::jsonb
      );
    $cron$
  );
end $$;

-- تحقق: لازم يطلع 2 جداول و 3 دوال وجدولة وحدة
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('whatsapp_links', 'whatsapp_messages')) as tables,
  (select count(*) from pg_proc where proname in ('whatsapp_link_code', 'whatsapp_set_prefs', 'whatsapp_unlink')) as functions,
  (select count(*) from cron.job where jobname = 'whatsapp-morning') as cron_jobs;
