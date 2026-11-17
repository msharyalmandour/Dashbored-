-- فحص المشرفة (2026-11-14) — ٣ إصلاحات. ما يحذف بيانات ولا يغيّر جداول/أعمدة.
--
-- ١) كل رد من المشرفة بضغطة (اعتماد محضر، تأكيد موعد، جواب سؤال) كان يطلّع بمحادثة الفريق كرتين:
--    «رسالة جديدة من المشرف/ة» + «المشرف/ة أكد/ت الموعد». وكل إيصال آلي كان يروح لقارئ الطلبات (commit-extract)
--    ويصرف نداء ذكاء على رسالة مثل «✅ اعتمدتُ محضر اجتماع…» — ويمكن يطلّع منها «طلب» وهمي.
--    الحين: الإيصال اللي له كرت خاص ما يتكرر، والإيصال الآلي ما ينقرا إلا لو فيه ملاحظة كتبتها هي.
-- ٢) عضو الفريق كان يقدر يعدّل رسالته ويحوّلها لنوع «event» (يعني يقدر يزوّر كرت «رسالة من المشرف/ة»). انقفلت.
-- ٣) ملاحظات المشرفة على أقسام المقترح: الفريق كان يقدر يعدّل نصها نفسه. الحين يقدرون بس يعلّمونها «انحلّت».

-- ───────── ١) trg_chat_event ─────────
create or replace function public.trg_chat_event()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_team uuid;
  v_receipt boolean;
  v_has_card boolean;
  v_has_note boolean;
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
      -- إيصالات الضغطة الوحدة (تكتبها دوال المشرفة نفسها بقوالب ثابتة)
      v_receipt := new.body ~ '^(✅ اعتمدتُ محضر اجتماع |✏️ طلبتُ تعديلًا على محضر اجتماع |✅ قراري على «|📅 أكّدتُ اجتماع |📅 ما أقدر على موعد |✅ وافقتُ على تمديد «|🗓️ حددتُ موعدًا ثانيًا لـ «|✋ ما وافقتُ على تمديد «|🗓️ غيّرتُ موعد «|🏁 موعد التسليم النهائي صار |🏁 شلتُ موعد التسليم النهائي|⏳ ما راح أكون متاح/ة من |✅ اعتمدنا قسم «|✅ We approved the ")';
      -- هذي لها كرت خاص من جدولها (المحضر/السؤال/الموعد) — ما نكرر
      v_has_card := new.body ~ '^(✅ اعتمدتُ محضر اجتماع |✏️ طلبتُ تعديلًا على محضر اجتماع |✅ قراري على «|📅 أكّدتُ اجتماع |📅 ما أقدر على موعد )';
      -- فيها كلام كتبته هي (ملاحظة) — نخليها تنقرا عشان لو فيها طلب
      v_has_note := (new.body like '% — %' and new.body !~ '^✅ (اعتمدنا قسم «|We approved the ")')
        or new.body ~ '^✏️ طلبتُ تعديلًا' or (new.body ~ '^📅 ما أقدر على موعد ' and new.body !~ 'اقترحوا غيره\.$');

      if not v_has_card then
        perform public.post_team_event(new.team_id, null, 'رسالة جديدة من المشرف/ة',
          jsonb_build_object('type', 'supervisor_message', 'message_id', new.id, 'excerpt', left(new.body, 200), 'body', left(new.body, 1500), 'by', new.sender_name));
      end if;
      -- نقراها: يطلع منها طلبات/وعود مقترحة (commit-extract)
      if not v_receipt or v_has_note then
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
  end if;
  return new;
end $function$;

-- ───────── ٢) تعديل رسائل المحادثة: ما يصير «event» ─────────
drop policy if exists "authors edit their messages" on public.team_messages;
create policy "authors edit their messages" on public.team_messages
  for update to authenticated
  using ((auth.uid() = author_id) and (team_id = public.my_team_id()))
  with check ((auth.uid() = author_id) and (team_id = public.my_team_id()) and (kind = any (array['user'::text, 'agent'::text, 'poll'::text])));

-- ───────── ٣) ملاحظات المشرفة: الفريق يعلّمها «انحلّت» بس ─────────
revoke update on public.section_comments from authenticated;
grant update (resolved_at) on public.section_comments to authenticated;
