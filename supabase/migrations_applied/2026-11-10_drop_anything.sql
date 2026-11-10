-- ═══ «ارموا أي شي» — المرحلة ١: البيانات والحفظ والتراجع ═══
-- يشغّله صاحب المشروع من SQL Editor. ما يحذف ولا يغيّر أي بيانات موجودة: جداول جديدة + أعمدة اختيارية جديدة.
-- كل الجداول الجديدة عليها RLS بالفريق (my_team_id()).

-- ── ١) أعمدة اختيارية على جداول موجودة ──
alter table public.tasks add column if not exists target_count integer check (target_count is null or target_count between 1 and 200);
alter table public.tasks add column if not exists drop_id uuid;            -- «من رمية»
alter table public.files add column if not exists storage_path text;       -- ملفات الرمية بحاوية drops (مو Drive)
alter table public.validated_tools add column if not exists team_id uuid references public.teams(id) on delete cascade;

-- أداة قياس رماها فريق تبقى خاصة فيه؛ أدوات المكتبة العامة (team_id فاضي) تبقى للكل
drop policy if exists "tools library readable by members" on public.validated_tools;
create policy "tools library readable by members" on public.validated_tools for select to authenticated
  using (team_id is null or team_id = public.my_team_id());
drop policy if exists "members can add tools" on public.validated_tools;
create policy "members can add tools" on public.validated_tools for insert to authenticated
  with check (saved_by = auth.uid() and (team_id is null or team_id = public.my_team_id()));
drop policy if exists "team deletes its own tools" on public.validated_tools;
create policy "team deletes its own tools" on public.validated_tools for delete to authenticated
  using (team_id = public.my_team_id() and saved_by = auth.uid());

-- ── ٢) أماكن جديدة صغيرة ──
-- نسخة مقترحة لقسم بالمقترح (من ملف Word): ما نكتب فوق نص الفريق أبدًا
create table if not exists public.proposal_section_drafts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  section_key text not null check (char_length(section_key) <= 40),
  content text not null check (char_length(content) <= 60000),
  source text not null default 'drop',
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.proposal_section_drafts enable row level security;
create policy "team reads drafts" on public.proposal_section_drafts for select to authenticated using (team_id = public.my_team_id());
create policy "team adds drafts" on public.proposal_section_drafts for insert to authenticated
  with check (team_id = public.my_team_id() and created_by = auth.uid() and public.team_can_write(team_id));
create policy "team updates drafts" on public.proposal_section_drafts for update to authenticated using (team_id = public.my_team_id() and public.team_can_write(team_id));
create policy "author deletes drafts" on public.proposal_section_drafts for delete to authenticated using (team_id = public.my_team_id() and created_by = auth.uid());

-- بيانات (Excel/CSV) لاستوديو التحليل: الأعمدة + العدد + عيّنة، والملف نفسه بحاوية drops
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  columns jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  sample_rows jsonb not null default '[]'::jsonb,
  storage_path text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.datasets enable row level security;
create policy "team reads datasets" on public.datasets for select to authenticated using (team_id = public.my_team_id());
create policy "team adds datasets" on public.datasets for insert to authenticated
  with check (team_id = public.my_team_id() and created_by = auth.uid() and public.team_can_write(team_id));
create policy "author deletes datasets" on public.datasets for delete to authenticated using (team_id = public.my_team_id() and created_by = auth.uid());

-- ── ٣) الرميات ──
create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.my_team_id() references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  status text not null default 'uploading' check (status in ('uploading','reading','ready','filed','undone','failed')),
  error_code text check (error_code is null or error_code in ('unreadable','unsupported','nothing_found','offline','ai_limit','too_large','failed')),
  source text not null default 'page' check (source in ('page','global','share','orb','paste','chat')),
  summary text not null default '',
  input_hash text,                 -- كاش: نفس الملفات مرة ثانية = نفس النتايج بدون ذكاء
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  filed_at timestamptz
);
create index if not exists drops_team_created on public.drops (team_id, created_at desc);
create index if not exists drops_team_hash on public.drops (team_id, input_hash);

create table if not exists public.drop_items (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  team_id uuid not null default public.my_team_id(),
  kind text not null check (kind in ('file','text','url')),
  name text not null default '',
  storage_path text,
  mime text,
  size integer,
  sha256 text,
  page_count integer,
  extracted_text text,
  ocr_used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists drop_items_drop on public.drop_items (drop_id);

create table if not exists public.drop_results (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  team_id uuid not null default public.my_team_id(),
  item_id uuid references public.drop_items(id) on delete set null,
  destination text not null check (destination in ('library','tasks','minutes','supervisor_note','supervisor_question','proposal','dataset','tools','ethics','calendar','files')),
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  included boolean not null default true,
  ord integer not null default 0,
  created_entity_type text,
  created_entity_id uuid,
  created_entities jsonb not null default '[]'::jsonb,   -- [{type,id,snapshot}] لكل اللي انخلق (مهام كثيرة = كيانات كثيرة)
  filed_note text,                                        -- مثل needs_leader
  undone_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists drop_results_drop on public.drop_results (drop_id, ord);

alter table public.drops enable row level security;
alter table public.drop_items enable row level security;
alter table public.drop_results enable row level security;
create policy "team reads drops" on public.drops for select to authenticated using (team_id = public.my_team_id());
create policy "member starts a drop" on public.drops for insert to authenticated
  with check (team_id = public.my_team_id() and user_id = auth.uid() and public.team_can_write(team_id));
create policy "team updates its drops" on public.drops for update to authenticated using (team_id = public.my_team_id());
create policy "team reads drop items" on public.drop_items for select to authenticated using (team_id = public.my_team_id());
create policy "team adds drop items" on public.drop_items for insert to authenticated
  with check (team_id = public.my_team_id() and exists (select 1 from public.drops d where d.id = drop_id and d.team_id = public.my_team_id()));
create policy "team reads drop results" on public.drop_results for select to authenticated using (team_id = public.my_team_id());
create policy "team edits drop results" on public.drop_results for update to authenticated using (team_id = public.my_team_id());
-- النتايج يكتبها drop-read بصلاحية السيرفر (service role)

-- تحديث مباشر: الواجهة تنتقل من «يقرا» للنتايج بدون سؤال متكرر
do $$ begin
  begin alter publication supabase_realtime add table public.drops; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.drop_results; exception when duplicate_object then null; end;
end $$;

-- ── ٤) حاوية التخزين drops (خاصة، ٢٥ ميغا للملف، مسار {team_id}/{drop_id}/{file}) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drops', 'drops', false, 26214400, array[
  'application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain','text/markdown','application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "team uploads drop files" on storage.objects;
create policy "team uploads drop files" on storage.objects for insert to authenticated
  with check (bucket_id = 'drops' and (storage.foldername(name))[1] = public.my_team_id()::text and public.team_can_write(public.my_team_id()));
drop policy if exists "team reads drop files" on storage.objects;
create policy "team reads drop files" on storage.objects for select to authenticated
  using (bucket_id = 'drops' and (storage.foldername(name))[1] = public.my_team_id()::text);
drop policy if exists "team deletes drop files" on storage.objects;
create policy "team deletes drop files" on storage.objects for delete to authenticated
  using (bucket_id = 'drops' and (storage.foldername(name))[1] = public.my_team_id()::text and owner = auth.uid());

-- ── ٥) الحفظ: كل النتايج المختارة بعملية وحدة (إما تنحط كلها أو ولا شي) ──
-- SECURITY INVOKER: نفس صلاحيات المستخدم بالضبط (RLS)، فما يقدر يسوي عن طريق الرمية شي ما يقدر يسويه بيده.
create or replace function public.drop_file(p_drop_id uuid)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_drop public.drops;
  v_proj uuid := public.my_research_project_id();
  v_team uuid := public.my_team_id();
  v_leader boolean := exists (select 1 from public.profiles where id = auth.uid() and role = 'leader');
  v_name text := coalesce((select name from public.profiles where id = auth.uid()), '');
  r public.drop_results;
  p jsonb;
  e jsonb;
  ents jsonb;
  note text;
  v_count integer := 0;
  rec record;
begin
  select * into v_drop from public.drops where id = p_drop_id and team_id = v_team for update;
  if not found then raise exception 'drop_not_found'; end if;
  if v_drop.status <> 'ready' then raise exception 'drop_not_ready'; end if;

  for r in select * from public.drop_results where drop_id = p_drop_id and included order by ord loop
    p := r.payload; ents := '[]'::jsonb; note := null;

    if r.destination = 'library' then
      insert into public.evidence_papers (research_project_id, title, authors, year, theme, study_design, key_finding, relevance, section, link, added_by, country, aim, sample, data_collection)
      values (v_proj, left(coalesce(nullif(p->>'title',''), r.title), 300), coalesce(p->>'authors',''), nullif(p->>'year','')::int, coalesce(nullif(p->>'theme',''), 'عام'),
              coalesce(p->>'design',''), coalesce(p->>'finding',''), coalesce(p->>'relevance',''),
              case when p->>'section' in ('background','literature-review','gap','methodology','other') then p->>'section' else 'literature-review' end,
              nullif(p->>'url',''), auth.uid(), coalesce(p->>'country',''), coalesce(p->>'aim',''), coalesce(p->>'sample',''), coalesce(p->>'data_collection',''))
      returning * into rec;
      ents := ents || jsonb_build_object('type','evidence_papers','id',rec.id,'snapshot',to_jsonb(rec));

    elsif r.destination = 'tasks' then
      if not v_leader then
        note := 'needs_leader';
      else
        for e in select * from jsonb_array_elements(coalesce(p->'tasks','[]'::jsonb)) loop
          insert into public.tasks (team_id, title, description, assignee_id, due_date, priority, status, section_key, target_count, created_by, drop_id)
          values (v_team, left(e->>'title', 200), coalesce(e->>'note',''), coalesce(nullif(e->>'owner_id','')::uuid, auth.uid()),
                  coalesce(nullif(e->>'due','')::date, current_date + 7), 'medium', 'todo', nullif(e->>'place',''), nullif(e->>'target_count','')::int, auth.uid(), p_drop_id)
          returning * into rec;
          ents := ents || jsonb_build_object('type','tasks','id',rec.id,'snapshot',to_jsonb(rec));
        end loop;
      end if;

    elsif r.destination = 'minutes' then
      insert into public.meeting_minutes (research_project_id, meeting_date, attendees, agenda, discussion, decisions, action_items, created_by)
      values (v_proj, coalesce(nullif(p->>'meeting_date','')::date, current_date), '{}', coalesce(p->>'agenda',''), coalesce(p->>'discussion',''), coalesce(p->>'decisions',''),
              coalesce((select string_agg('- ' || x, E'\n') from jsonb_array_elements_text(coalesce(p->'action_items','[]'::jsonb)) x), ''), auth.uid())
      returning * into rec;
      ents := ents || jsonb_build_object('type','meeting_minutes','id',rec.id,'snapshot',to_jsonb(rec));

    elsif r.destination = 'supervisor_note' then
      for e in select * from jsonb_array_elements(coalesce(p->'comments','[]'::jsonb)) loop
        insert into public.supervisor_feedback (research_project_id, comment, section_key, status, created_by, feedback_date)
        values (v_proj, left(e->>'text', 1000), coalesce(nullif(e->>'section',''), 'other'), 'open', auth.uid(), current_date)
        returning * into rec;
        ents := ents || jsonb_build_object('type','supervisor_feedback','id',rec.id,'snapshot',to_jsonb(rec));
      end loop;

    elsif r.destination = 'supervisor_question' then
      if jsonb_array_length(coalesce(p->'options','[]'::jsonb)) between 2 and 4 then
        insert into public.decision_requests (team_id, question, options, created_by)
        values (v_team, left(p->>'question', 400), array(select left(x, 120) from jsonb_array_elements_text(p->'options') x), auth.uid())
        returning * into rec;
        ents := ents || jsonb_build_object('type','decision_requests','id',rec.id,'snapshot',to_jsonb(rec));
      else
        insert into public.supervisor_messages (team_id, sender, sender_name, body, created_by)
        values (v_team, 'team', v_name, left(p->>'question', 1500), auth.uid())
        returning * into rec;
        ents := ents || jsonb_build_object('type','supervisor_messages','id',rec.id,'snapshot',to_jsonb(rec));
      end if;

    elsif r.destination = 'proposal' then
      insert into public.proposal_section_drafts (team_id, section_key, content, source, created_by)
      values (v_team, coalesce(nullif(p->>'section',''), 'background'), p->>'text', 'drop', auth.uid())
      returning * into rec;
      ents := ents || jsonb_build_object('type','proposal_section_drafts','id',rec.id,'snapshot',to_jsonb(rec));

    elsif r.destination = 'dataset' then
      insert into public.datasets (team_id, name, columns, row_count, sample_rows, storage_path, created_by)
      values (v_team, left(coalesce(nullif(p->>'name',''), r.title), 200), coalesce(p->'columns','[]'::jsonb), coalesce(nullif(p->>'row_count','')::int, 0),
              coalesce(p->'sample_rows','[]'::jsonb), nullif(p->>'storage_path',''), auth.uid())
      returning * into rec;
      ents := ents || jsonb_build_object('type','datasets','id',rec.id,'snapshot',to_jsonb(rec));

    elsif r.destination = 'tools' then
      insert into public.validated_tools (tool_key, tool_name, measures, items, reliability, languages, population, source_title, source_url, year, is_arabic, saved_by, team_id)
      values ('team-' || gen_random_uuid(), left(coalesce(nullif(p->>'tool_name',''), r.title), 200), left(coalesce(p->>'dimensions',''), 400),
              left(coalesce(p->>'items_count',''), 120), '', '', '', left(coalesce(p->>'scale',''), 400), '', null, false, auth.uid(), v_team)
      returning * into rec;
      ents := ents || jsonb_build_object('type','validated_tools','id',rec.id,'snapshot',to_jsonb(rec));

    elsif r.destination = 'ethics' then
      -- نحفظ القيم القديمة عشان التراجع يرجّعها
      select to_jsonb(ea) into e from public.ethical_approval ea where research_project_id = v_proj;
      if e is null then
        note := 'no_ethics_record';
      else
        update public.ethical_approval set ref_number = coalesce(nullif(p->>'approval_number',''), ref_number),
               meeting_date = coalesce(nullif(p->>'approval_date','')::date, meeting_date), outcome = 'granted', updated_at = now()
         where research_project_id = v_proj returning * into rec;
        ents := ents || jsonb_build_object('type','ethical_approval','id',v_proj,'snapshot',to_jsonb(rec),'previous',e);
      end if;

    elsif r.destination = 'calendar' then
      for e in select * from jsonb_array_elements(coalesce(p->'events','[]'::jsonb)) loop
        insert into public.calendar_events (team_id, title, event_date, event_time, event_type, location, created_by)
        values (v_team, left(e->>'title', 200), (e->>'date')::date, coalesce(nullif(e->>'time',''), '09:00'),
                case when e->>'type' in ('meeting','review','fieldwork','deadline') then e->>'type' else 'meeting' end, '', auth.uid())
        returning * into rec;
        ents := ents || jsonb_build_object('type','calendar_events','id',rec.id,'snapshot',to_jsonb(rec));
      end loop;

    elsif r.destination = 'files' then
      insert into public.files (research_project_id, name, mime_type, size_bytes, category, uploaded_by, storage_path)
      values (v_proj, left(coalesce(nullif(p->>'name',''), r.title), 300), coalesce(p->>'mime','application/octet-stream'), coalesce(nullif(p->>'size','')::int, 0), 'general', auth.uid(), nullif(p->>'storage_path',''))
      returning * into rec;
      ents := ents || jsonb_build_object('type','files','id',rec.id,'snapshot',to_jsonb(rec));
    end if;

    update public.drop_results
       set created_entities = ents,
           created_entity_type = case when jsonb_array_length(ents) > 0 then ents->0->>'type' end,
           created_entity_id = case when jsonb_array_length(ents) > 0 then (ents->0->>'id')::uuid end,
           filed_note = note
     where id = r.id;
    v_count := v_count + jsonb_array_length(ents);
  end loop;

  update public.drops set status = 'filed', filed_at = now() where id = p_drop_id;
  return jsonb_build_object('created', v_count);
end $$;

-- ── ٦) التراجع: يشيل بس اللي انخلق من الرمية، وبشرط ما أحد عدّله بعدها ──
create or replace function public.drop_undo(p_drop_id uuid, p_result_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  r public.drop_results;
  e jsonb;
  cur jsonb;
  n integer;
  removed integer := 0;
  kept jsonb := '[]'::jsonb;
  left_any boolean;
begin
  if not exists (select 1 from public.drops where id = p_drop_id and team_id = public.my_team_id()) then raise exception 'drop_not_found'; end if;

  for r in select * from public.drop_results where drop_id = p_drop_id and undone_at is null and (p_result_id is null or id = p_result_id) loop
    left_any := false;
    for e in select * from jsonb_array_elements(r.created_entities) loop
      if e->>'type' = 'ethical_approval' then
        select to_jsonb(ea) into cur from public.ethical_approval ea where research_project_id = (e->>'id')::uuid;
        if cur - 'updated_at' = (e->'snapshot') - 'updated_at' then
          update public.ethical_approval set ref_number = e->'previous'->>'ref_number', meeting_date = (e->'previous'->>'meeting_date')::date,
                 outcome = e->'previous'->>'outcome', updated_at = now() where research_project_id = (e->>'id')::uuid;
          removed := removed + 1;
        else
          kept := kept || jsonb_build_object('result', r.id, 'type', e->>'type', 'reason', 'edited'); left_any := true;
        end if;
        continue;
      end if;
      execute format('select to_jsonb(t) from public.%I t where id = $1', e->>'type') into cur using (e->>'id')::uuid;
      if cur is null then continue; end if;                       -- انحذف من قبل
      if cur <> e->'snapshot' then                                -- أحد عدّله بعد الرمية: نخليه
        kept := kept || jsonb_build_object('result', r.id, 'type', e->>'type', 'id', e->>'id', 'reason', 'edited'); left_any := true;
        continue;
      end if;
      execute format('delete from public.%I where id = $1', e->>'type') using (e->>'id')::uuid;
      get diagnostics n = row_count;
      if n = 0 then                                               -- RLS ما سمح (مثل حذف مهمة لغير القائد)
        kept := kept || jsonb_build_object('result', r.id, 'type', e->>'type', 'id', e->>'id', 'reason', 'no_permission'); left_any := true;
      else
        removed := removed + 1;
      end if;
    end loop;
    if not left_any then update public.drop_results set undone_at = now() where id = r.id; end if;
  end loop;

  if p_result_id is null and not exists (select 1 from public.drop_results where drop_id = p_drop_id and undone_at is null and jsonb_array_length(created_entities) > 0) then
    update public.drops set status = 'undone' where id = p_drop_id;
  end if;
  return jsonb_build_object('removed', removed, 'kept', kept);
end $$;

grant execute on function public.drop_file(uuid) to authenticated;
grant execute on function public.drop_undo(uuid, uuid) to authenticated;
