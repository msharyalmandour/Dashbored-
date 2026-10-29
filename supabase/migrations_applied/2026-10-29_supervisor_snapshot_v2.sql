-- صفحة المشرفة الجديدة: نفس get_team_snapshot (نفس الرابط ونفس الصلاحيات، قراءة فقط) مع حقول عرض إضافية:
-- موضوع البحث، آخر نشاط لكل عضو، وآخر تحديث وتقدّم المستندات. ما فيه أي كتابة ولا جدول جديد.
create or replace function public.get_team_snapshot(p_token uuid)
returns json
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_team_id uuid;
  v_team_name text;
  v_note text;
  v_note_at timestamptz;
  v_project_id uuid;
  result json;
begin
  select id, name, supervisor_note, supervisor_note_at
    into v_team_id, v_team_name, v_note, v_note_at
  from public.teams where share_token = p_token;
  if v_team_id is null then
    return null;
  end if;

  select id into v_project_id from public.research_projects where team_id = v_team_id;

  select json_build_object(
    'teamName', v_team_name,
    'supervisorNote', v_note,
    'supervisorNoteAt', v_note_at,
    'project', (
      select json_build_object(
        'title', rp.title,
        'description', rp.description,
        'researchType', rp.research_type,
        'startDate', rp.start_date,
        'targetSubmissionDate', rp.target_submission_date,
        'createdAt', rp.created_at
      )
      from public.research_projects rp where rp.id = v_project_id
    ),
    'members', (
      select coalesce(json_agg(json_build_object(
        'name', p.name,
        'initials', p.initials,
        'role', p.role,
        -- آخر نشاط = آخر تحديث لجلسة الدخول (يتجدد وهو فاتح التطبيق) أو آخر تسجيل دخول
        'lastActiveAt', greatest(
          (select max(s.updated_at) from auth.sessions s where s.user_id = p.id),
          (select u.last_sign_in_at from auth.users u where u.id = p.id)
        )
      ) order by (p.role = 'leader') desc, p.created_at), '[]'::json)
      from public.profiles p
      where p.team_id = v_team_id
    ),
    'tasks', (
      select coalesce(json_agg(json_build_object(
        'title', t.title,
        'status', t.status,
        'dueDate', t.due_date,
        'assigneeName', p.name
      ) order by t.due_date), '[]'::json)
      from public.tasks t
      left join public.profiles p on p.id = t.assignee_id
      where t.team_id = v_team_id
    ),
    'proposalSections', (
      select coalesce(json_agg(json_build_object(
        'key', ps.section_key,
        'labelAr', ps.label_ar,
        'labelEn', ps.label_en,
        'status', ps.status,
        'content', ps.content
      ) order by ps.order_index), '[]'::json)
      from public.proposal_sections ps
      where ps.research_project_id = v_project_id
    ),
    'proposalUpdatedAt', (select max(ps.updated_at) from public.proposal_sections ps where ps.research_project_id = v_project_id),
    'methodology', (
      select json_build_object(
        'studyDesign', m.study_design,
        'studySetting', m.study_setting,
        'population', m.population,
        'samplingInclusion', m.sampling_inclusion,
        'samplingExclusion', m.sampling_exclusion,
        'sampleSize', m.sample_size,
        'samplingTechnique', m.sampling_technique,
        'dataCollectionMethods', m.data_collection_methods,
        'dataCollectionProcedure', m.data_collection_procedure,
        'dataAnalysis', m.data_analysis,
        'ethicalConsiderations', m.ethical_considerations,
        'studyToolType', m.study_tool_type,
        'studyToolName', m.study_tool_name,
        'updatedAt', m.updated_at
      )
      from public.methodology m
      where m.research_project_id = v_project_id
    ),
    -- نفس حساب ethicsStepsDone بالتطبيق (٤ خطوات)، أرقام بس بدون محتوى النموذج
    'ethics', (
      select json_build_object(
        'stepsDone',
          (case when coalesce(e.application_date::text, '') <> '' and e.expected_start_date is not null and e.expected_end_date is not null then 1 else 0 end)
          + (case when coalesce(trim(e.pi_name), '') <> '' and coalesce(trim(e.pi_affiliation), '') <> '' and coalesce(trim(e.pi_email), '') <> '' and coalesce(trim(e.supervisor_names), '') <> '' then 1 else 0 end)
          + (case when pr.answered = 13 then 1 else 0 end)
          + (case when e.attach_protocol_or_proposal and e.attach_participant_info_sheet and e.attach_consent_form and e.attach_study_tools and e.attach_other_supportive_docs then 1 else 0 end),
        'principles', pr.answered,
        'attachments',
          coalesce(e.attach_protocol_or_proposal, false)::int + coalesce(e.attach_participant_info_sheet, false)::int + coalesce(e.attach_consent_form, false)::int + coalesce(e.attach_study_tools, false)::int + coalesce(e.attach_other_supportive_docs, false)::int,
        'outcome', e.outcome,
        'updatedAt', e.updated_at
      )
      from public.ethical_approval e
      cross join lateral (
        select count(*)::int as answered
        from unnest(array[
          e.principle_written_explanation, e.principle_oral_explanation, e.principle_written_consent, e.principle_oral_consent,
          e.principle_voluntary_informed, e.principle_withdraw_option, e.principle_harm_informed, e.principle_confidentiality_guaranteed,
          e.principle_anonymity_guaranteed, e.principle_vulnerable_groups_informed, e.principle_interview_no_explanation_needed,
          e.principle_safe_data_storage, e.principle_will_publish
        ]) v where v is not null and v <> ''
      ) pr
      where e.research_project_id = v_project_id
    )
  ) into result;

  return result;
end;
$function$;
