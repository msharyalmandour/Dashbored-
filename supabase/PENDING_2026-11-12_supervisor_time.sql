-- المرحلة ٤: لوحة المشرف/ة + التحكم بالوقت
-- ١) طلبات التمديد  ٢) سجل الوقت (يشوفه الطرفين)  ٣) «مو متاح/ة»  ٤) المشرف/ة يتحكم بالمواعيد  ٥) بيانات اللوحة
-- كل الجداول الجديدة: قراءة للفريق نفسه بس (RLS بـ team_id)، والكتابة عن طريق دوال محمية فقط.

-- ── ١) طلبات التمديد ──
create table if not exists public.extension_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  current_due date,
  requested_due date not null,
  reason text not null check (reason in ('waiting_hospital', 'exams', 'sick', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'countered', 'rejected', 'withdrawn')),
  final_due date,
  supervisor_name text not null default '' check (char_length(supervisor_name) <= 80),
  supervisor_note text not null default '' check (char_length(supervisor_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists extension_requests_team_idx on public.extension_requests (team_id, created_at desc);
create unique index if not exists extension_requests_one_pending on public.extension_requests (task_id) where status = 'pending';
alter table public.extension_requests enable row level security;
drop policy if exists "team sees extension requests" on public.extension_requests;
create policy "team sees extension requests" on public.extension_requests for select to authenticated
  using (team_id = public.my_team_id());

-- ── ٢) سجل الوقت ──
create table if not exists public.time_log (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  actor text not null check (actor in ('student', 'supervisor')),
  actor_name text not null default '',
  action text not null check (action in ('requested', 'approved', 'countered', 'rejected', 'withdrawn', 'due_changed', 'deadline_changed', 'away_on', 'away_off')),
  task_id uuid references public.tasks (id) on delete set null,
  task_title text not null default '',
  request_id uuid references public.extension_requests (id) on delete set null,
  from_date date,
  to_date date,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists time_log_team_idx on public.time_log (team_id, created_at desc);
alter table public.time_log enable row level security;
drop policy if exists "team sees time log" on public.time_log;
create policy "team sees time log" on public.time_log for select to authenticated
  using (team_id = public.my_team_id());

-- ── ٣) «مو متاح/ة» ──
create table if not exists public.supervisor_away (
  team_id uuid primary key references public.teams (id) on delete cascade,
  from_date date not null,
  to_date date not null check (to_date >= from_date),
  reason text not null default '' check (char_length(reason) <= 80),
  move_meetings boolean not null default true,
  defer_requests boolean not null default true,
  message_students boolean not null default true,
  moved_count int not null default 0,
  supervisor_name text not null default '' check (char_length(supervisor_name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.supervisor_away enable row level security;
drop policy if exists "team sees supervisor away" on public.supervisor_away;
create policy "team sees supervisor away" on public.supervisor_away for select to authenticated
  using (team_id = public.my_team_id());

-- ── الطالب يطلب تمديد ──
create or replace function public.request_extension(p_task_id uuid, p_due date, p_reason text, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_team uuid := public.my_team_id();
  v_task public.tasks%rowtype;
  v_id uuid;
  v_name text;
begin
  if v_team is null then raise exception 'no_team'; end if;
  if not public.team_can_write(v_team) then raise exception 'read_only'; end if;
  select * into v_task from public.tasks where id = p_task_id and team_id = v_team;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  if p_due is null or p_due < (now() at time zone 'Asia/Riyadh')::date then raise exception 'bad_date'; end if;
  if v_task.due_date is not null and p_due <= v_task.due_date then raise exception 'bad_date'; end if;
  if p_reason not in ('waiting_hospital', 'exams', 'sick', 'other') then raise exception 'bad_reason'; end if;
  insert into public.extension_requests (team_id, task_id, requested_by, current_due, requested_due, reason, note)
  values (v_team, p_task_id, auth.uid(), v_task.due_date, p_due, p_reason, left(trim(coalesce(p_note, '')), 500))
  returning id into v_id;
  select name into v_name from public.profiles where id = auth.uid();
  insert into public.time_log (team_id, actor, actor_name, action, task_id, task_title, request_id, from_date, to_date, note)
  values (v_team, 'student', coalesce(v_name, ''), 'requested', p_task_id, v_task.title, v_id, v_task.due_date, p_due, p_reason);
  return v_id;
end $$;
grant execute on function public.request_extension(uuid, date, text, text) to authenticated;

create or replace function public.withdraw_extension(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team uuid := public.my_team_id();
  v_r public.extension_requests%rowtype;
  v_name text;
begin
  select * into v_r from public.extension_requests where id = p_id and team_id = v_team and status = 'pending';
  if v_r.id is null then raise exception 'not_pending'; end if;
  update public.extension_requests set status = 'withdrawn', resolved_at = now() where id = p_id;
  select name into v_name from public.profiles where id = auth.uid();
  insert into public.time_log (team_id, actor, actor_name, action, task_id, task_title, request_id, from_date, to_date)
  values (v_team, 'student', coalesce(v_name, ''), 'withdrawn', v_r.task_id, (select title from public.tasks where id = v_r.task_id), p_id, v_r.current_due, v_r.requested_due);
end $$;
grant execute on function public.withdraw_extension(uuid) to authenticated;

-- ── المشرف/ة يرد على الطلب (برمز الرابط) ──
create or replace function public.supervisor_resolve_extension(p_token uuid, p_id uuid, p_decision text, p_date date default null, p_note text default '', p_name text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_r public.extension_requests%rowtype;
  v_title text;
  v_final date;
  v_note text := left(trim(coalesce(p_note, '')), 500);
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  if p_decision not in ('approved', 'countered', 'rejected') then raise exception 'bad_decision'; end if;
  select * into v_r from public.extension_requests where id = p_id and team_id = v_team and status = 'pending';
  if v_r.id is null then raise exception 'not_pending'; end if;
  select title into v_title from public.tasks where id = v_r.task_id;
  v_final := case p_decision when 'approved' then v_r.requested_due when 'countered' then p_date else null end;
  if p_decision = 'countered' and v_final is null then raise exception 'date_required'; end if;

  update public.extension_requests
    set status = p_decision, final_due = v_final, supervisor_name = v_name, supervisor_note = v_note, resolved_at = now()
    where id = p_id;
  if v_final is not null then
    update public.tasks
      set due_date = v_final,
          status = case when status = 'overdue' and v_final >= (now() at time zone 'Asia/Riyadh')::date then 'todo' else status end
      where id = v_r.task_id;
  end if;
  insert into public.time_log (team_id, actor, actor_name, action, task_id, task_title, request_id, from_date, to_date, note)
  values (v_team, 'supervisor', v_name, p_decision, v_r.task_id, coalesce(v_title, ''), p_id, v_r.current_due, coalesce(v_final, v_r.requested_due), v_note);
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    case p_decision
      when 'approved' then '✅ وافقتُ على تمديد «' || left(coalesce(v_title, ''), 120) || '» لين ' || to_char(v_final, 'YYYY/MM/DD') || '.'
      when 'countered' then '🗓️ حددتُ موعدًا ثانيًا لـ «' || left(coalesce(v_title, ''), 120) || '»: ' || to_char(v_final, 'YYYY/MM/DD') || '.'
      else '✋ ما وافقتُ على تمديد «' || left(coalesce(v_title, ''), 120) || '»' end
    || case when v_note <> '' then ' — ' || v_note else '' end);
end $$;
grant execute on function public.supervisor_resolve_extension(uuid, uuid, text, date, text, text) to anon, authenticated;

-- ── المشرف/ة يغيّر موعد أي مهمة بنفسه ──
create or replace function public.supervisor_set_task_due(p_token uuid, p_task_id uuid, p_due date, p_name text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_task public.tasks%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  select * into v_task from public.tasks where id = p_task_id and team_id = v_team;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  if v_task.due_date is not distinct from p_due then return; end if;
  update public.tasks
    set due_date = p_due,
        status = case when status = 'overdue' and (p_due is null or p_due >= (now() at time zone 'Asia/Riyadh')::date) then 'todo' else status end
    where id = p_task_id;
  -- لو فيه طلب تمديد معلّق على نفس المهمة، تعديلها المباشر يقفله
  update public.extension_requests set status = 'countered', final_due = p_due, supervisor_name = v_name, resolved_at = now()
    where task_id = p_task_id and status = 'pending' and p_due is not null;
  insert into public.time_log (team_id, actor, actor_name, action, task_id, task_title, from_date, to_date)
  values (v_team, 'supervisor', v_name, 'due_changed', p_task_id, v_task.title, v_task.due_date, p_due);
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    '🗓️ غيّرتُ موعد «' || left(v_task.title, 120) || '» ' ||
    case when p_due is null then 'إلى بدون موعد.' else 'إلى ' || to_char(p_due, 'YYYY/MM/DD') || '.' end);
end $$;
grant execute on function public.supervisor_set_task_due(uuid, uuid, date, text) to anon, authenticated;

-- ── المشرف/ة يحدد موعد التسليم النهائي للبحث ──
create or replace function public.supervisor_set_project_deadline(p_token uuid, p_date date, p_name text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_old date;
  v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  select target_submission_date into v_old from public.research_projects where team_id = v_team;
  if not found then raise exception 'no_project'; end if;
  if v_old is not distinct from p_date then return; end if;
  update public.research_projects set target_submission_date = p_date, updated_at = now() where team_id = v_team;
  insert into public.time_log (team_id, actor, actor_name, action, from_date, to_date)
  values (v_team, 'supervisor', v_name, 'deadline_changed', v_old, p_date);
  insert into public.supervisor_messages (team_id, sender, sender_name, body)
  values (v_team, 'supervisor', v_name,
    case when p_date is null then '🏁 شلتُ موعد التسليم النهائي مؤقتًا.'
         else '🏁 موعد التسليم النهائي صار ' || to_char(p_date, 'YYYY/MM/DD') || '.' end);
end $$;
grant execute on function public.supervisor_set_project_deadline(uuid, date, text) to anon, authenticated;

-- ── «مو متاح/ة»: ينقل المواعيد لأقرب يوم متاح بعد الرجعة ──
create or replace function public.supervisor_set_away(
  p_token uuid, p_from date, p_to date, p_reason text default '',
  p_move boolean default true, p_defer boolean default true, p_message boolean default true, p_name text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_reason text := left(trim(coalesce(p_reason, '')), 80);
  v_windows jsonb;
  v_day date;
  v_time text;
  v_b record;
  v_moved int := 0;
  v_waiting int := 0;
  i int;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'bad_dates'; end if;
  if p_to > p_from + 120 then raise exception 'too_long'; end if;

  if p_move then
    select windows into v_windows from public.supervisor_availability where team_id = v_team;
    for v_b in
      select * from public.meeting_bookings
      where team_id = v_team and status in ('pending', 'confirmed') and booking_date between p_from and p_to
      order by booking_date, booking_time
    loop
      v_day := null;
      v_time := v_b.booking_time;
      for i in 1..30 loop
        if v_windows is null or jsonb_array_length(v_windows) = 0 then
          v_day := p_to + 1;
          exit;
        end if;
        if exists (select 1 from jsonb_array_elements(v_windows) w where (w->>'weekday')::int = extract(dow from p_to + i)::int) then
          v_day := p_to + i;
          if not exists (
            select 1 from jsonb_array_elements(v_windows) w
            where (w->>'weekday')::int = extract(dow from v_day)::int and v_b.booking_time >= w->>'start' and v_b.booking_time < w->>'end'
          ) then
            select min(w->>'start') into v_time from jsonb_array_elements(v_windows) w where (w->>'weekday')::int = extract(dow from v_day)::int;
          end if;
          exit;
        end if;
      end loop;
      v_day := coalesce(v_day, p_to + 1);
      update public.meeting_bookings set booking_date = v_day, booking_time = v_time where id = v_b.id;
      if v_b.calendar_event_id is not null then
        update public.calendar_events set event_date = v_day, event_time = v_time where id = v_b.calendar_event_id;
      end if;
      v_moved := v_moved + 1;
    end loop;
  end if;

  select
    (select count(*) from public.extension_requests where team_id = v_team and status = 'pending')
    + (select count(*) from public.decision_requests where team_id = v_team and status = 'open')
    + (select count(*) from public.meeting_bookings where team_id = v_team and status = 'pending')
  into v_waiting;

  insert into public.supervisor_away (team_id, from_date, to_date, reason, move_meetings, defer_requests, message_students, moved_count, supervisor_name, created_at)
  values (v_team, p_from, p_to, v_reason, p_move, p_defer, p_message, v_moved, v_name, now())
  on conflict (team_id) do update set from_date = excluded.from_date, to_date = excluded.to_date, reason = excluded.reason,
    move_meetings = excluded.move_meetings, defer_requests = excluded.defer_requests, message_students = excluded.message_students,
    moved_count = public.supervisor_away.moved_count + excluded.moved_count, supervisor_name = excluded.supervisor_name, created_at = now();

  insert into public.time_log (team_id, actor, actor_name, action, from_date, to_date, note)
  values (v_team, 'supervisor', v_name, 'away_on', p_from, p_to, v_reason);

  if p_message then
    insert into public.supervisor_messages (team_id, sender, sender_name, body)
    values (v_team, 'supervisor', v_name,
      '⏳ ما راح أكون متاح/ة من ' || to_char(p_from, 'YYYY/MM/DD') || ' لين ' || to_char(p_to, 'YYYY/MM/DD') ||
      case when v_reason <> '' then ' (' || v_reason || ')' else '' end || '.' ||
      case when v_moved > 0 then ' مواعيد هالفترة (' || v_moved || ') انتقلت لأقرب يوم متاح بعد رجعتي.' else '' end);
  end if;
  return jsonb_build_object('moved', v_moved, 'waiting', v_waiting);
end $$;
grant execute on function public.supervisor_set_away(uuid, date, date, text, boolean, boolean, boolean, text) to anon, authenticated;

create or replace function public.supervisor_clear_away(p_token uuid, p_name text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_a public.supervisor_away%rowtype;
begin
  select id into v_team from public.teams where share_token = p_token;
  if v_team is null then raise exception 'invalid_token'; end if;
  delete from public.supervisor_away where team_id = v_team returning * into v_a;
  if v_a.team_id is not null then
    insert into public.time_log (team_id, actor, actor_name, action, from_date, to_date)
    values (v_team, 'supervisor', left(trim(coalesce(p_name, '')), 80), 'away_off', v_a.from_date, v_a.to_date);
  end if;
end $$;
grant execute on function public.supervisor_clear_away(uuid, text) to anon, authenticated;

-- ── ٥) بيانات لوحة المشرف/ة لفريق واحد (برمز الرابط) ──
create or replace function public.supervisor_dash(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  v_team uuid;
  v_name text;
  v_rp public.research_projects%rowtype;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select id, name into v_team, v_name from public.teams where share_token = p_token;
  if v_team is null then return null; end if;
  select * into v_rp from public.research_projects where team_id = v_team;

  return jsonb_build_object(
    'teamName', v_name,
    'today', v_today,
    'project', case when v_rp.id is null then null else jsonb_build_object(
      'title', v_rp.title, 'startDate', v_rp.start_date, 'deadline', v_rp.target_submission_date, 'createdAt', v_rp.created_at) end,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'initials', p.initials, 'role', p.role,
        'lastActiveAt', greatest(
          (select max(s.updated_at) from auth.sessions s where s.user_id = p.id),
          (select u.last_sign_in_at from auth.users u where u.id = p.id))
      ) order by (p.role = 'leader') desc, p.created_at), '[]'::jsonb)
      from public.profiles p where p.team_id = v_team
    ),
    'tasks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'description', t.description, 'sectionKey', t.section_key, 'status', t.status,
        'dueDate', t.due_date, 'completedAt', t.completed_at, 'createdAt', t.created_at,
        'assigneeId', t.assignee_id, 'assigneeName', pr.name, 'targetCount', t.target_count, 'source', t.source
      ) order by t.due_date nulls last, t.created_at), '[]'::jsonb)
      from public.tasks t left join public.profiles pr on pr.id = t.assignee_id
      where t.team_id = v_team
    ),
    'papers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'addedById', e.added_by,
        'lit', (trim(e.country) <> '' or trim(e.aim) <> '' or trim(e.sample) <> '' or trim(e.data_collection) <> '')
      )), '[]'::jsonb)
      from public.evidence_papers e where e.research_project_id = v_rp.id
    ),
    'sections', (
      select coalesce(jsonb_agg(jsonb_build_object('key', s.section_key, 'written', trim(s.content) <> '')), '[]'::jsonb)
      from public.proposal_sections s where s.research_project_id = v_rp.id
    ),
    'bookings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'date', b.booking_date, 'time', b.booking_time, 'durationMin', b.duration_min, 'status', b.status
      ) order by b.booking_date, b.booking_time), '[]'::jsonb)
      from public.meeting_bookings b where b.team_id = v_team and b.status in ('pending', 'confirmed') and b.booking_date >= v_today
    ),
    'lastTeamMessage', (
      select jsonb_build_object('body', left(m.body, 140), 'at', m.created_at)
      from public.supervisor_messages m
      where m.team_id = v_team and m.sender = 'team'
        and m.created_at > coalesce((select max(x.created_at) from public.supervisor_messages x where x.team_id = v_team and x.sender = 'supervisor'), '-infinity')
      order by m.created_at limit 1
    ),
    'extensions', (
      select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', r.id, 'taskId', r.task_id, 'taskTitle', t.title, 'requestedBy', pr.name,
          'currentDue', r.current_due, 'requestedDue', r.requested_due, 'reason', r.reason, 'note', r.note,
          'status', r.status, 'finalDue', r.final_due, 'supervisorNote', r.supervisor_note,
          'createdAt', r.created_at, 'resolvedAt', r.resolved_at) as x
        from public.extension_requests r
        left join public.tasks t on t.id = r.task_id
        left join public.profiles pr on pr.id = r.requested_by
        where r.team_id = v_team and (r.status = 'pending' or r.created_at > now() - interval '60 days')
        order by r.created_at desc limit 30
      ) s
    ),
    'log', (
      select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('id', l.id, 'actor', l.actor, 'actorName', l.actor_name, 'action', l.action,
          'taskTitle', l.task_title, 'from', l.from_date, 'to', l.to_date, 'note', l.note, 'at', l.created_at) as x
        from public.time_log l where l.team_id = v_team order by l.created_at desc limit 40
      ) s
    ),
    'away', (
      select jsonb_build_object('from', a.from_date, 'to', a.to_date, 'reason', a.reason, 'moveMeetings', a.move_meetings,
        'deferRequests', a.defer_requests, 'messageStudents', a.message_students, 'moved', a.moved_count, 'name', a.supervisor_name)
      from public.supervisor_away a where a.team_id = v_team and a.to_date >= v_today
    )
  );
end $$;
grant execute on function public.supervisor_dash(uuid) to anon, authenticated;

-- ── إصلاح الفويس: مخزن «drops» كان يرفض ملفات الصوت، فما انرسل ولا فويس ──
update storage.buckets
set allowed_mime_types = array(select distinct unnest(coalesce(allowed_mime_types, '{}') || array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/x-m4a']))
where id = 'drops';
