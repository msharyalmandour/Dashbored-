-- عدد مقاعد المؤسسين المحجوزة (من ١٥) لعرضه بصفحة الهبوط — رقم فقط، بدون أي بيانات فرق
create or replace function public.founder_seats_taken()
returns integer
language sql
stable
security definer
set search_path = public
as $$ select least(count(*), 15)::int from public.teams where is_founder $$;
revoke all on function public.founder_seats_taken() from public;
grant execute on function public.founder_seats_taken() to anon, authenticated;
