-- حالة ربط درايف الفريق مباشرة من القاعدة (بدل انتظار إقلاع دالة drive-team).
-- ترجع الحقول الآمنة بس — بدون أي توكن.
create or replace function public.team_drive_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'configured', true,
    'connected', dc.research_project_id is not null,
    'googleEmail', dc.google_email,
    'folderLink', dc.folder_link,
    'connectedByName', coalesce(cp.name, ''),
    'connectedAt', dc.created_at,
    'isLeader', coalesce(me.role = 'leader', false)
  )
  from public.profiles me
  left join public.research_projects rp on rp.team_id = me.team_id
  left join public.drive_connections dc on dc.research_project_id = rp.id
  left join public.profiles cp on cp.id = dc.connected_by
  where me.id = auth.uid()
  order by dc.created_at desc nulls last
  limit 1
$$;
revoke all on function public.team_drive_status() from public;
grant execute on function public.team_drive_status() to authenticated;
