-- تفضيلات العرض تمشي مع الحساب على أي جهاز (null = ما اختار بعد، نستخدم الجهاز)
alter table public.profiles add column if not exists reduce_motion boolean;
alter table public.profiles add column if not exists paper_mode boolean;
