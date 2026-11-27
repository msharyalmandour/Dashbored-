-- ============================================================
-- سر الجدولة + جدولة الإيميلات (شغّليه مرة وحدة من Supabase → SQL Editor)
--   • القاعدة تولّد السر بنفسها وتخزّنه بـ Vault — ما تحتاجين تدخلين أي مفتاح
--   • الدالة team-digest تتحقق منه عبر verify_digest_secret (مقفولة على service_role فقط)
--   • التقرير الأسبوعي: كل خميس ٦ المساء بتوقيت الرياض (١٥:٠٠ UTC)
--   • التذكير اليومي: كل يوم ٨ الصبح بتوقيت الرياض (٠٥:٠٠ UTC)
-- آمن لتشغيله أكثر من مرة (ما يكرر السر ولا الجدولة).
-- ============================================================

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'digest_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'digest_secret',
      'سر استدعاء الدالة team-digest من الجدولة'
    );
  end if;
end $$;

create or replace function public.verify_digest_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'digest_secret' and decrypted_secret = p_secret
  );
$$;

revoke all on function public.verify_digest_secret(text) from public, anon, authenticated;
grant execute on function public.verify_digest_secret(text) to service_role;

select cron.schedule(
  'team-digest-weekly',
  '0 15 * * 4',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/team-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
    ),
    body := '{"action":"weekly"}'::jsonb
  );
  $job$
);

select cron.schedule(
  'team-digest-daily',
  '0 5 * * *',
  $job$
  select net.http_post(
    url := 'https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/team-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_secret')
    ),
    body := '{"action":"daily"}'::jsonb
  );
  $job$
);
