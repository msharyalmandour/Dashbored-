-- Wesync · تقفيل: الدوال الجديدة للطلاب المسجّلين بس (Supabase يعطي anon صلاحية تلقائية على الدوال الجديدة).
-- كل دالة أصلًا تتأكد من المستخدم وفريقه، فهذا تنظيف احتياطي. ما يغيّر أي بيانات. آمن للتشغيل أكثر من مرة.
-- دوال الدكتورة (supervisor_post · get_supervisor_thread · supervisor_code · doc_code_stats) تبقى لـ anon لأنها تدخل بالرابط بدون حساب.
revoke execute on function public.mark_doc_thread_read() from anon;
revoke execute on function public.rsvp_doc_meeting(uuid, text) from anon;
revoke execute on function public.delete_doc_message(uuid) from anon;
revoke execute on function public.unlock_door(text) from anon;
revoke execute on function public.mark_door_seen(text) from anon;
revoke execute on function public.join_doc_code(text) from anon;
revoke execute on function public.add_authorship(text, integer, integer) from anon;
revoke execute on function public.my_founder_number() from anon;
revoke execute on function public.my_ambassador_code() from anon;
revoke execute on function public.claim_referral(text) from anon;
revoke execute on function public.my_ambassador_stats() from anon;
revoke execute on function public.admin_growth_weekly(integer) from anon;
-- تحقق: لازم يرجع 0
-- select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname in ('mark_doc_thread_read','rsvp_doc_meeting','delete_doc_message','unlock_door','mark_door_seen','join_doc_code','add_authorship','my_founder_number','my_ambassador_code','claim_referral','my_ambassador_stats','admin_growth_weekly')
--   and has_function_privilege('anon', p.oid, 'execute');
