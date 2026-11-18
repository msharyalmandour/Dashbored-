-- Wesync · الخطوات 13–15: محادثة الدكتورة بدل الإيميل + المجموعتين + الحجوزات
-- يبني على supervisor_messages الموجود (مجموعة «مع الدكتورة») — ما يحذف ولا يغيّر أي بيانات.
-- «الفريق بس» = team_messages الموجود: الدكتورة ما عندها حساب بالفريق (الأدوار leader/member بس)،
-- وسياسة القراءة team_id = my_team_id() تمنعها من قاعدة البيانات نفسها، وكل دوال الرابط (p_token) ما تقرأ team_messages.
-- آمن للتشغيل أكثر من مرة.

-- 1) نوع الرسالة + محتواها المنظّم + حذف خلال دقيقتين
alter table public.supervisor_messages add column if not exists kind text not null default 'text';
alter table public.supervisor_messages add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.supervisor_messages add column if not exists deleted_at timestamptz;
do $$ begin
  alter table public.supervisor_messages add constraint supervisor_messages_kind_chk
    check (kind in ('text', 'request', 'meeting', 'approval', 'voice', 'file'));
exception when duplicate_object then null; end $$;

-- 2) «قراها 4 من 4» + حضور الموعد (RSVP) — لكل طالب على كل رسالة
create table if not exists public.supervisor_message_acks (
  message_id uuid not null references public.supervisor_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  rsvp text check (rsvp in ('yes', 'no', 'other')),
  rsvp_at timestamptz,
  primary key (message_id, profile_id)
);
alter table public.supervisor_message_acks enable row level security;
drop policy if exists "team reads acks" on public.supervisor_message_acks;
create policy "team reads acks" on public.supervisor_message_acks for select to authenticated
  using (exists (select 1 from public.supervisor_messages m where m.id = message_id and m.team_id = public.my_team_id()));
-- الكتابة عبر الدوال تحت بس (ما فيه سياسة insert/update مباشرة)

-- 3) الدكتورة ترسل (برمز الرابط): رسالة / طلب = مهمة / موعد / اعتماد
create or replace function public.supervisor_post(p_token uuid, p_kind text, p_body text, p_payload jsonb default '{}'::jsonb, p_name text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_body text := trim(coalesce(p_body, ''));
  v_kind text := coalesce(nullif(p_kind, ''), 'text');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_task uuid;
  v_assignee uuid;
  v_event uuid;
  v_id uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid token'; end if;
  if v_kind not in ('text', 'request', 'meeting', 'approval') then raise exception 'invalid kind'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1500 then raise exception 'invalid length'; end if;
  if (select count(*) from public.supervisor_messages
      where team_id = v_team and sender = 'supervisor' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limit';
  end if;

  if v_kind = 'request' then
    -- الطلب يصير مهمة: الطالب لازم يكون من نفس الفريق
    v_assignee := nullif(v_payload->>'assignee', '')::uuid;
    if v_assignee is null or not exists (select 1 from public.profiles where id = v_assignee and team_id = v_team) then
      raise exception 'invalid assignee';
    end if;
    insert into public.tasks (team_id, title, description, assignee_id, due_date, status, priority, source)
    values (v_team, left(coalesce(nullif(trim(v_payload->>'title'), ''), v_body), 200), v_body, v_assignee,
            nullif(v_payload->>'due', '')::date, 'todo', 'medium', 'supervisor')
    returning id into v_task;
    v_payload := v_payload || jsonb_build_object('task_id', v_task);
  elsif v_kind = 'meeting' then
    -- الموعد ينضاف لتقويم الفريق تلقائيًا
    if nullif(v_payload->>'date', '') is null then raise exception 'invalid date'; end if;
    insert into public.calendar_events (team_id, title, event_date, event_time, event_type, location)
    values (v_team, left(coalesce(nullif(trim(v_payload->>'title'), ''), 'اجتماع مع المشرف/ة'), 120),
            (v_payload->>'date')::date, nullif(v_payload->>'time', ''), 'meeting', left(coalesce(v_payload->>'place', ''), 120))
    returning id into v_event;
    v_payload := v_payload || jsonb_build_object('event_id', v_event);
  end if;

  insert into public.supervisor_messages (team_id, sender, sender_name, body, kind, payload)
  values (v_team, 'supervisor', left(trim(coalesce(p_name, '')), 80), v_body, v_kind, v_payload)
  returning id into v_id;
  update public.teams set supervisor_note = v_body, supervisor_note_at = now() where id = v_team;
  return jsonb_build_object('id', v_id, 'task_id', v_task, 'event_id', v_event);
end $$;
revoke all on function public.supervisor_post(uuid, text, text, jsonb, text) from public;
grant execute on function public.supervisor_post(uuid, text, text, jsonb, text) to anon, authenticated;

-- 4) المحادثة (للدكتورة برمز الرابط): النوع + المحتوى + كم قراها + الحضور
create or replace function public.get_supervisor_thread(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with t as (select id from public.teams where share_token = p_token),
  n as (select count(*)::int c from public.profiles where team_id = (select id from t))
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender', m.sender, 'senderName', m.sender_name, 'body', m.body, 'createdAt', m.created_at,
    'kind', m.kind, 'payload', m.payload,
    'reads', (select count(*) from public.supervisor_message_acks a where a.message_id = m.id),
    'members', (select c from n),
    'rsvps', (select coalesce(jsonb_object_agg(a.profile_id, a.rsvp), '{}'::jsonb) from public.supervisor_message_acks a where a.message_id = m.id and a.rsvp is not null)
  ) order by m.created_at), '[]'::jsonb)
  from (
    select * from public.supervisor_messages
    where team_id = (select id from t) and deleted_at is null
    order by created_at desc limit 150
  ) m;
$$;

-- 5) الطلاب: «شافتها» لكل رسالة، والحضور، والحذف خلال دقيقتين
create or replace function public.mark_doc_thread_read()
returns void language sql security definer set search_path = public as $$
  insert into public.supervisor_message_acks (message_id, profile_id)
  select m.id, auth.uid() from public.supervisor_messages m
  where m.team_id = public.my_team_id() and m.sender = 'supervisor' and auth.uid() is not null
  on conflict (message_id, profile_id) do nothing;
$$;
revoke all on function public.mark_doc_thread_read() from public;
grant execute on function public.mark_doc_thread_read() to authenticated;

create or replace function public.rsvp_doc_meeting(p_message uuid, p_rsvp text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_rsvp not in ('yes', 'no', 'other') then raise exception 'invalid rsvp'; end if;
  if not exists (select 1 from public.supervisor_messages where id = p_message and team_id = public.my_team_id() and kind = 'meeting') then
    raise exception 'not found';
  end if;
  insert into public.supervisor_message_acks (message_id, profile_id, rsvp, rsvp_at)
  values (p_message, auth.uid(), p_rsvp, now())
  on conflict (message_id, profile_id) do update set rsvp = excluded.rsvp, rsvp_at = now();
end $$;
revoke all on function public.rsvp_doc_meeting(uuid, text) from public;
grant execute on function public.rsvp_doc_meeting(uuid, text) to authenticated;

create or replace function public.delete_doc_message(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.supervisor_messages set deleted_at = now()
  where id = p_id and created_by = auth.uid() and sender = 'team' and deleted_at is null
    and created_at > now() - interval '2 minutes';
  return found;
end $$;
revoke all on function public.delete_doc_message(uuid) from public;
grant execute on function public.delete_doc_message(uuid) to authenticated;

-- 6) قراءة الطلاب لمجموعة الدكتورة تخفي المحذوف (السياسة الحالية تبقى، نضيف شرط الحذف)
drop policy if exists "team sees supervisor messages" on public.supervisor_messages;
create policy "team sees supervisor messages" on public.supervisor_messages for select to authenticated
  using (team_id = public.my_team_id() and deleted_at is null);

-- تحقق سريع بعد التشغيل:
-- select kind, count(*) from public.supervisor_messages group by 1;
-- select proname from pg_proc where proname in ('supervisor_post','mark_doc_thread_read','rsvp_doc_meeting','delete_doc_message');
