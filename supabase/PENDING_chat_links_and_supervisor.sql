-- لم يُطبَّق بعد: المالك يشغّله من Supabase → SQL Editor. آمن لتشغيله أكثر من مرة. ما يحذف أي بيانات.
-- (موافقة المالك 2026-11-05: «سويها كلها» — ربط المحادثة بالموقع + تواصل أريح مع المشرف/ة)

-- ═══ ١) رسائل المحادثة: نوع الرسالة (عادية / الوكيل / حدث بالموقع / تصويت) + بيانات إضافية ═══
alter table public.team_messages add column if not exists kind text not null default 'user';
alter table public.team_messages drop constraint if exists team_messages_kind_check;
alter table public.team_messages add constraint team_messages_kind_check check (kind in ('user', 'agent', 'event', 'poll'));
alter table public.team_messages add column if not exists meta jsonb;
-- أحداث الموقع (مثل «المشرف/ة اعتمدت المحضر») ما لها كاتب من الفريق
alter table public.team_messages alter column author_id drop not null;

-- الأعضاء يكتبون رسائل عادية / رد الوكيل / تصويت بس — «حدث» يكتبه السيرفر وحده
drop policy if exists "members post to their team" on public.team_messages;
create policy "members post to their team" on public.team_messages
  for insert to authenticated
  with check (auth.uid() = author_id and team_id = public.my_team_id() and public.team_can_write(public.my_team_id()) and kind in ('user', 'agent', 'poll'));

-- أحداث الموقع تنزل بالمحادثة تلقائيًا (من السيرفر، فتوصل حتى لو صارت من صفحة المشرف/ة)
create or replace function public.post_team_event(p_team uuid, p_actor uuid, p_body text, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_team is null then return; end if;
  insert into public.team_messages (team_id, author_id, body, kind, meta)
  values (p_team, p_actor, left(coalesce(nullif(p_body, ''), '·'), 4000), 'event', p_meta);
exception when others then
  -- الحدث إضافة: لو فشل ما نوقف الحفظ الأصلي
  null;
end;
$$;
revoke all on function public.post_team_event(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.trg_chat_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  if tg_table_name = 'tasks' then
    if new.status = 'done' and coalesce(old.status, '') <> 'done' then
      perform public.post_team_event(new.team_id, coalesce(auth.uid(), new.assignee_id), 'خلّص مهمة «' || new.title || '»',
        jsonb_build_object('type', 'task_done', 'task_id', new.id, 'title', new.title));
    end if;
  elsif tg_table_name = 'evidence_papers' then
    select team_id into v_team from public.research_projects where id = new.research_project_id;
    perform public.post_team_event(v_team, coalesce(new.added_by, auth.uid()), 'أضاف دراسة «' || new.title || '»',
      jsonb_build_object('type', 'paper_added', 'paper_id', new.id, 'title', new.title, 'year', new.year));
  elsif tg_table_name = 'minutes_approvals' then
    if new.status is distinct from old.status and new.status in ('approved', 'changes_requested') then
      perform public.post_team_event(new.team_id, null, case when new.status = 'approved' then 'المشرف/ة اعتمد/ت المحضر' else 'المشرف/ة طلب/ت تعديل على المحضر' end,
        jsonb_build_object('type', 'minutes_' || new.status, 'minutes_id', new.minutes_id, 'note', new.note, 'by', new.supervisor_name));
    end if;
  elsif tg_table_name = 'decision_requests' then
    if new.status is distinct from old.status and new.status = 'answered' then
      perform public.post_team_event(new.team_id, null, 'المشرف/ة جاوب/ت: ' || new.question,
        jsonb_build_object('type', 'decision_answered', 'decision_id', new.id, 'question', new.question,
          'answer', case when new.chosen_index is not null then new.options[new.chosen_index + 1] else null end, 'note', new.answer_note, 'by', new.supervisor_name));
    end if;
  elsif tg_table_name = 'meeting_bookings' then
    if new.status is distinct from old.status and new.status in ('confirmed', 'declined') then
      perform public.post_team_event(new.team_id, null, case when new.status = 'confirmed' then 'المشرف/ة أكد/ت الموعد' else 'المشرف/ة اعتذر/ت عن الموعد' end,
        jsonb_build_object('type', 'booking_' || new.status, 'booking_id', new.id, 'date', new.booking_date, 'time', new.booking_time, 'note', new.supervisor_note));
    end if;
  elsif tg_table_name = 'supervisor_messages' then
    if new.sender = 'supervisor' then
      perform public.post_team_event(new.team_id, null, 'رسالة جديدة من المشرف/ة',
        jsonb_build_object('type', 'supervisor_message', 'excerpt', left(new.body, 200), 'by', new.sender_name));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_event_tasks on public.tasks;
create trigger chat_event_tasks after update of status on public.tasks for each row execute function public.trg_chat_event();
drop trigger if exists chat_event_papers on public.evidence_papers;
create trigger chat_event_papers after insert on public.evidence_papers for each row execute function public.trg_chat_event();
drop trigger if exists chat_event_minutes on public.minutes_approvals;
create trigger chat_event_minutes after update of status on public.minutes_approvals for each row execute function public.trg_chat_event();
drop trigger if exists chat_event_decisions on public.decision_requests;
create trigger chat_event_decisions after update of status on public.decision_requests for each row execute function public.trg_chat_event();
drop trigger if exists chat_event_bookings on public.meeting_bookings;
create trigger chat_event_bookings after update of status on public.meeting_bookings for each row execute function public.trg_chat_event();
drop trigger if exists chat_event_supervisor_msg on public.supervisor_messages;
create trigger chat_event_supervisor_msg after insert on public.supervisor_messages for each row execute function public.trg_chat_event();

-- ═══ ٢) التصويت بالمحادثة ═══
create table if not exists public.team_message_votes (
  message_id uuid not null references public.team_messages (id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  team_id uuid not null default public.my_team_id() references public.teams (id) on delete cascade,
  option smallint not null check (option between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
alter table public.team_message_votes enable row level security;
drop policy if exists "team sees votes" on public.team_message_votes;
create policy "team sees votes" on public.team_message_votes for select to authenticated using (team_id = public.my_team_id());
drop policy if exists "members vote" on public.team_message_votes;
create policy "members vote" on public.team_message_votes for insert to authenticated with check (profile_id = auth.uid() and team_id = public.my_team_id());
drop policy if exists "members change vote" on public.team_message_votes;
create policy "members change vote" on public.team_message_votes for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid() and team_id = public.my_team_id());
drop policy if exists "members remove vote" on public.team_message_votes;
create policy "members remove vote" on public.team_message_votes for delete to authenticated using (profile_id = auth.uid());

-- ═══ ٣) «ذكّرني» من المحادثة (إشعار جوال بالوقت المختار) ═══
create table if not exists public.chat_reminders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams (id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message_id uuid references public.team_messages (id) on delete set null,
  body text not null check (char_length(body) between 1 and 300),
  remind_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chat_reminders_due on public.chat_reminders (remind_at) where sent_at is null;
alter table public.chat_reminders enable row level security;
drop policy if exists "own reminders" on public.chat_reminders;
create policy "own reminders" on public.chat_reminders for select to authenticated using (profile_id = auth.uid());
drop policy if exists "add own reminders" on public.chat_reminders;
create policy "add own reminders" on public.chat_reminders for insert to authenticated with check (profile_id = auth.uid() and team_id = public.my_team_id());
drop policy if exists "remove own reminders" on public.chat_reminders;
create policy "remove own reminders" on public.chat_reminders for delete to authenticated using (profile_id = auth.uid());

-- ═══ ٤) ملاحظات المشرف/ة على نص المقترح (تصير مهمة على كاتب القسم) ═══
create table if not exists public.section_comments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  section_key text not null check (char_length(section_key) <= 80),
  quote text not null default '' check (char_length(quote) <= 600),
  body text not null check (char_length(body) between 1 and 2000),
  author_name text not null default '' check (char_length(author_name) <= 80),
  task_id uuid references public.tasks (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists section_comments_team on public.section_comments (team_id, created_at desc);
alter table public.section_comments enable row level security;
drop policy if exists "team reads comments" on public.section_comments;
create policy "team reads comments" on public.section_comments for select to authenticated using (team_id = public.my_team_id());
drop policy if exists "team resolves comments" on public.section_comments;
create policy "team resolves comments" on public.section_comments for update to authenticated using (team_id = public.my_team_id()) with check (team_id = public.my_team_id());

-- المشرف/ة (بدون حساب، برابطها) تعلّق على جملة: تنحفظ الملاحظة وتصير مهمة على كاتب القسم (أو القائد) وتنزل بالمحادثة
create or replace function public.supervisor_add_section_comment(p_token uuid, p_section_key text, p_quote text, p_body text, p_name text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_project uuid;
  v_label text;
  v_owner uuid;
  v_task uuid;
  v_id uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'empty'; end if;
  select id into v_project from public.research_projects where team_id = v_team order by created_at limit 1;
  select label_ar, owner_id into v_label, v_owner from public.proposal_sections where research_project_id = v_project and section_key = p_section_key;
  if v_label is null then raise exception 'not_found'; end if;
  if v_owner is null then
    select id into v_owner from public.profiles where team_id = v_team and role = 'leader' order by created_at limit 1;
  end if;
  if v_owner is not null then
    insert into public.tasks (team_id, title, description, assignee_id, due_date, status, priority, section_key)
    values (v_team, left('ملاحظة المشرف/ة على «' || v_label || '»: ' || trim(p_body), 200),
      case when coalesce(p_quote, '') <> '' then '«' || left(p_quote, 600) || '»' || chr(10) || chr(10) else '' end || left(trim(p_body), 2000),
      v_owner, current_date + 3, 'todo', 'high', p_section_key)
    returning id into v_task;
  end if;
  insert into public.section_comments (team_id, section_key, quote, body, author_name, task_id)
  values (v_team, p_section_key, left(coalesce(p_quote, ''), 600), left(trim(p_body), 2000), left(coalesce(p_name, ''), 80), v_task)
  returning id into v_id;
  perform public.post_team_event(v_team, null, 'ملاحظة من المشرف/ة على «' || v_label || '»',
    jsonb_build_object('type', 'section_comment', 'section_key', p_section_key, 'label', v_label, 'quote', left(coalesce(p_quote, ''), 200), 'excerpt', left(trim(p_body), 200), 'task_id', v_task, 'assignee', v_owner, 'by', p_name));
  return v_id;
end;
$$;
revoke all on function public.supervisor_add_section_comment(uuid, text, text, text, text) from public;
grant execute on function public.supervisor_add_section_comment(uuid, text, text, text, text) to anon, authenticated;

-- المشرف/ة تشوف ملاحظاتها السابقة برابطها
create or replace function public.supervisor_section_comments(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'sectionKey', c.section_key, 'quote', c.quote, 'body', c.body, 'createdAt', c.created_at, 'resolvedAt', c.resolved_at) order by c.created_at desc), '[]'::jsonb)
  from public.section_comments c join public.teams t on t.id = c.team_id
  where t.share_token = p_token;
$$;
revoke all on function public.supervisor_section_comments(uuid) from public;
grant execute on function public.supervisor_section_comments(uuid) to anon, authenticated;

-- ═══ ٥) إيميل المشرف/ة: فوري أو ملخص أسبوعي بس ═══
alter table public.supervisor_email_subscriptions add column if not exists digest text not null default 'instant';
alter table public.supervisor_email_subscriptions drop constraint if exists supervisor_email_subscriptions_digest_check;
alter table public.supervisor_email_subscriptions add constraint supervisor_email_subscriptions_digest_check check (digest in ('instant', 'weekly'));

-- ═══ ٦) الرسائل اللحظية والجدولة ═══
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_message_votes') then
    alter publication supabase_realtime add table public.team_message_votes;
  end if;
end $$;

-- ملخص المشرف/ة الأسبوعي: الأحد ٧:٣٠ الصبح بتوقيت الرياض (٠٤:٣٠ UTC)
select cron.unschedule(jobid) from cron.job where jobname = 'supervisor-weekly';
select cron.schedule(
  'supervisor-weekly',
  '30 4 * * 0',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/supervisor-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
    body := '{"action":"weekly"}'::jsonb
  );
  $job$
);

-- تذكيرات «ذكّرني» كل ١٠ دقايق
select cron.unschedule(jobid) from cron.job where jobname = 'chat-reminders';
select cron.schedule(
  'chat-reminders',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
    body := '{"action":"reminders"}'::jsonb
  );
  $job$
);
