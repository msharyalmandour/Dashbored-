-- المرحلة ١ (الدكتورة): كلام الدكتورة يصير التزامات تنتتبّع. جداول وأعمدة جديدة بس — ما يحذف ولا يغيّر بيانات موجودة.
-- ١) commitments: طلبات الدكتورة من الفريق (from_supervisor) ووعودها لهم (to_team)
-- ٢) tasks.source + tasks.commitment_id: المهمة تنكتب «من الدكتورة»
-- ٣) section_comments.text_snapshot: نص القسم لحظة ملاحظتها (لـ «أثر ملاحظتك»)
-- ٤) دوال: اعتماد/تجاهل/نجمة للفريق، ودوال الدكتورة برمز رابطها، وإيصال يطلع لها لما تخلص المهمة
-- ٥) أي رسالة من الدكتورة تنقرا تلقائيًا (commit-extract) وتطلع منها طلبات مقترحة

-- ── ١) الجدول ──
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  direction text not null check (direction in ('from_supervisor', 'to_team')),
  source_message_id uuid references public.supervisor_messages(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  quote text not null default '',
  assignee_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  due_label text not null default '',
  recurring_rule text,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'in_progress', 'done', 'dismissed')),
  important boolean not null default false,
  created_task_id uuid references public.tasks(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  done_at timestamptz,
  proof_path text,
  proof_name text,
  receipt_sent_at timestamptz,
  receipt_ack_at timestamptz,
  receipt_note text,
  created_at timestamptz not null default now()
);
create index if not exists commitments_team on public.commitments (team_id, created_at desc);
create index if not exists commitments_msg on public.commitments (source_message_id);
create index if not exists commitments_task on public.commitments (created_task_id);

alter table public.commitments enable row level security;
drop policy if exists commitments_read on public.commitments;
create policy commitments_read on public.commitments for select to authenticated using (team_id = public.my_team_id());
-- الكتابة كلها من الدوال تحت (فيها تحقق القائد/الفريق) — ما فيه كتابة مباشرة على الجدول

-- ── ٢) المهام ──
alter table public.tasks add column if not exists source text check (source is null or source in ('supervisor', 'drop', 'meeting'));
alter table public.tasks add column if not exists commitment_id uuid references public.commitments(id) on delete set null;

-- ── ٣) لقطة نص القسم وقت الملاحظة ──
alter table public.section_comments add column if not exists text_snapshot text;

-- ── ٤أ) الفريق: اعتماد (القائد بس) ← مهمة «من الدكتورة» ──
create or replace function public.approve_commitment(p_id uuid, p_title text default null, p_assignee uuid default null, p_due date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c public.commitments;
  v_task uuid;
  v_team uuid := public.my_team_id();
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'leader') then raise exception 'leader_only'; end if;
  if not public.team_can_write(v_team) then raise exception 'read_only'; end if;
  select * into c from public.commitments where id = p_id and team_id = v_team for update;
  if not found then raise exception 'not_found'; end if;
  if c.status <> 'proposed' then return c.created_task_id; end if;
  insert into public.tasks (team_id, title, description, assignee_id, due_date, status, priority, created_by, source, commitment_id)
  values (v_team, left(coalesce(nullif(trim(p_title), ''), c.title), 200),
          case when c.quote <> '' then '«' || left(c.quote, 600) || '»' else '' end,
          coalesce(p_assignee, c.assignee_id, auth.uid()),
          coalesce(p_due, (c.due_at at time zone 'Asia/Riyadh')::date, current_date + 3),
          'todo', case when c.important then 'high' else 'medium' end, auth.uid(), 'supervisor', c.id)
  returning id into v_task;
  update public.commitments
     set status = 'approved', created_task_id = v_task, approved_by = auth.uid(), approved_at = now(),
         title = left(coalesce(nullif(trim(p_title), ''), c.title), 200),
         assignee_id = coalesce(p_assignee, c.assignee_id, auth.uid()),
         due_at = coalesce(p_due::timestamptz, c.due_at)
   where id = c.id;
  return v_task;
end $$;

create or replace function public.dismiss_commitment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'leader') then raise exception 'leader_only'; end if;
  update public.commitments set status = 'dismissed' where id = p_id and team_id = public.my_team_id() and status = 'proposed';
end $$;

create or replace function public.set_commitment_important(p_id uuid, p_important boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.team_can_write(public.my_team_id()) then raise exception 'read_only'; end if;
  update public.commitments set important = p_important where id = p_id and team_id = public.my_team_id();
  update public.tasks set priority = case when p_important then 'high' else 'medium' end
   where commitment_id = p_id and team_id = public.my_team_id() and status <> 'done';
end $$;

-- ملف الإثبات (يطلع للدكتورة بالإيصال): بحاوية drops الخاصة تحت مجلد الفريق
create or replace function public.attach_commitment_proof(p_id uuid, p_path text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid := public.my_team_id();
begin
  if not public.team_can_write(v_team) then raise exception 'read_only'; end if;
  if p_path is null or split_part(p_path, '/', 1) <> v_team::text then raise exception 'bad_path'; end if;
  update public.commitments set proof_path = p_path, proof_name = left(coalesce(p_name, ''), 200)
   where id = p_id and team_id = v_team;
end $$;

-- ── ٤ب) المهمة تتحرك ← الالتزام يتحرك، ولما تخلص يطلع الإيصال للدكتورة ──
create or replace function public.trg_commitment_from_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.commitment_id is null or new.status is not distinct from old.status then return new; end if;
  if new.status = 'done' then
    update public.commitments set status = 'done', done_at = now() where id = new.commitment_id and status <> 'done';
  elsif new.status = 'in-progress' then
    update public.commitments set status = 'in_progress' where id = new.commitment_id and status in ('approved', 'done');
  else
    update public.commitments set status = 'approved', done_at = null where id = new.commitment_id and status in ('in_progress', 'done') and receipt_sent_at is null;
  end if;
  return new;
end $$;
drop trigger if exists commitment_from_task on public.tasks;
create trigger commitment_from_task after update of status on public.tasks for each row execute function public.trg_commitment_from_task();

create or replace function public.trg_commitment_receipt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'from_supervisor' and new.status = 'done' and old.status <> 'done' and new.receipt_sent_at is null then
    begin
      perform net.http_post(
        url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/supervisor-email',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
        body := jsonb_build_object('action', 'receipt', 'commitmentId', new.id)
      );
    exception when others then null; -- الإيصال يطلع بصفحتها بأي حال
    end;
  end if;
  return new;
end $$;
drop trigger if exists commitment_receipt on public.commitments;
create trigger commitment_receipt after update of status on public.commitments for each row execute function public.trg_commitment_receipt();

-- ── ٤ج) الدكتورة برمز رابطها ──
create or replace function public.supervisor_commitments(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'direction', c.direction, 'title', c.title, 'quote', c.quote, 'status', c.status, 'important', c.important,
        'due_at', c.due_at, 'due_label', c.due_label, 'done_at', c.done_at, 'created_at', c.created_at,
        'assignee', p.name, 'task_due', t.due_date, 'task_status', t.status,
        'proof_name', c.proof_name, 'has_proof', c.proof_path is not null,
        'receipt_sent_at', c.receipt_sent_at, 'receipt_ack_at', c.receipt_ack_at, 'receipt_note', c.receipt_note)
        order by c.created_at desc)
      from public.commitments c
      left join public.profiles p on p.id = c.assignee_id
      left join public.tasks t on t.id = c.created_task_id
      where c.team_id = v_team and c.status <> 'dismissed'), '[]'::jsonb),
    'impacts', coalesce((select jsonb_agg(jsonb_build_object(
        'id', sc.id, 'section_key', sc.section_key, 'label', ps.label_ar, 'body', sc.body, 'quote', sc.quote,
        'before', sc.text_snapshot, 'after', ps.content, 'created_at', sc.created_at, 'resolved_at', sc.resolved_at)
        order by sc.created_at desc)
      from public.section_comments sc
      join public.research_projects rp on rp.team_id = v_team
      join public.proposal_sections ps on ps.research_project_id = rp.id and ps.section_key = sc.section_key
      where sc.team_id = v_team and sc.text_snapshot is not null and sc.text_snapshot is distinct from ps.content), '[]'::jsonb)
  );
end $$;

create or replace function public.supervisor_ack_receipt(p_token uuid, p_id uuid, p_note text default null, p_name text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  update public.commitments set receipt_ack_at = now(), receipt_note = nullif(left(trim(coalesce(p_note, '')), 1500), '')
   where id = p_id and team_id = v_team and status = 'done';
  if coalesce(trim(p_note), '') <> '' then
    perform public.submit_supervisor_message(p_token, p_note, p_name);
  end if;
end $$;

create or replace function public.supervisor_set_important(p_token uuid, p_id uuid, p_important boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  update public.commitments set important = p_important where id = p_id and team_id = v_team;
  update public.tasks set priority = case when p_important then 'high' else 'medium' end
   where commitment_id = p_id and team_id = v_team and status <> 'done';
end $$;

create or replace function public.supervisor_fulfil_promise(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  update public.commitments set status = 'done', done_at = now() where id = p_id and team_id = v_team and direction = 'to_team';
end $$;

-- ملاحظتها على قسم تحفظ نص القسم لحظتها (نفس الدالة الموجودة + اللقطة)
create or replace function public.supervisor_add_section_comment(p_token uuid, p_section_key text, p_quote text, p_body text, p_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_team uuid; v_project uuid; v_label text; v_owner uuid; v_task uuid; v_id uuid; v_content text;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'empty'; end if;
  select id into v_project from public.research_projects where team_id = v_team order by created_at limit 1;
  select label_ar, owner_id, content into v_label, v_owner, v_content from public.proposal_sections where research_project_id = v_project and section_key = p_section_key;
  if v_label is null then raise exception 'not_found'; end if;
  if v_owner is null then
    select id into v_owner from public.profiles where team_id = v_team and role = 'leader' order by created_at limit 1;
  end if;
  if v_owner is not null then
    insert into public.tasks (team_id, title, description, assignee_id, due_date, status, priority, section_key, source)
    values (v_team, left('ملاحظة المشرف/ة على «' || v_label || '»: ' || trim(p_body), 200),
      case when coalesce(p_quote, '') <> '' then '«' || left(p_quote, 600) || '»' || chr(10) || chr(10) else '' end || left(trim(p_body), 2000),
      v_owner, current_date + 3, 'todo', 'high', p_section_key, 'supervisor')
    returning id into v_task;
  end if;
  insert into public.section_comments (team_id, section_key, quote, body, author_name, task_id, text_snapshot)
  values (v_team, p_section_key, left(coalesce(p_quote, ''), 600), left(trim(p_body), 2000), left(coalesce(p_name, ''), 80), v_task, v_content)
  returning id into v_id;
  perform public.post_team_event(v_team, null, 'ملاحظة من المشرف/ة على «' || v_label || '»',
    jsonb_build_object('type', 'section_comment', 'section_key', p_section_key, 'label', v_label, 'quote', left(coalesce(p_quote, ''), 200), 'excerpt', left(trim(p_body), 200), 'task_id', v_task, 'assignee', v_owner, 'by', p_name));
  return v_id;
end $$;

-- ── ٥) رسالتها تطلع بالمحادثة كفقاعة (النص كامل + رقمها)، وتنقرا تلقائيًا ──
create or replace function public.trg_chat_event()
returns trigger language plpgsql security definer set search_path = public as $$
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
        jsonb_build_object('type', 'supervisor_message', 'message_id', new.id, 'excerpt', left(new.body, 200), 'body', left(new.body, 1500), 'by', new.sender_name));
      -- نقراها: يطلع منها طلبات/وعود مقترحة (commit-extract)
      begin
        perform net.http_post(
          url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/commit-extract',
          headers := jsonb_build_object('Content-Type', 'application/json',
            'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')),
          body := jsonb_build_object('messageId', new.id)
        );
      exception when others then null; -- رسالتها تنحفظ حتى لو القراءة ما اشتغلت
      end;
    end if;
  end if;
  return new;
end $$;

-- التحديث المباشر للبطاقة والسجل
do $$ begin
  alter publication supabase_realtime add table public.commitments;
exception when duplicate_object then null; end $$;
