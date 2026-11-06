-- Rainbow Bridge development schema. Review and apply only to a confirmed Supabase project.
create extension if not exists pgcrypto;
create table if not exists public.rb_memorials (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 pet_name text not null check (char_length(trim(pet_name)) between 1 and 100),
 species text not null check (char_length(species) between 1 and 80),
 nickname text check (char_length(nickname)<=100),
 birth_year integer check (birth_year between 1850 and 2100),
 passing_year integer check (passing_year between 1850 and 2100),
 tribute text not null check (char_length(trim(tribute)) between 1 and 4000),
 favorite_memory text check (char_length(favorite_memory)<=3000),
 visibility text not null default 'public' check (visibility in ('public','unlisted')),
 allow_messages boolean not null default true,
 status text not null default 'pending' check (status in ('pending','approved','changes_requested','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 reviewed_at timestamptz,
 constraint rb_years check (birth_year is null or passing_year is null or birth_year<=passing_year)
);
create index if not exists rb_memorials_owner_idx on public.rb_memorials(owner_id);
create index if not exists rb_memorials_public_idx on public.rb_memorials(created_at desc) where status='approved' and visibility='public';
alter table public.rb_memorials enable row level security;
-- Owner may see their own submissions; visitors see approved public memorials only.
create policy "rb_read_own_or_public" on public.rb_memorials for select to authenticated using (owner_id=(select auth.uid()));
-- Public listings must use a safe, explicitly scoped server endpoint; no anonymous access to the owner-bearing table.
create policy "rb_insert_own_pending" on public.rb_memorials for insert to authenticated with check (owner_id=(select auth.uid()) and status='pending' and reviewed_at is null);
-- No client UPDATE/DELETE policy: review, corrections and removal require trusted server endpoints.
revoke all on public.rb_memorials from anon, authenticated;
grant select on public.rb_memorials to authenticated;
grant insert (owner_id,pet_name,species,nickname,birth_year,passing_year,tribute,favorite_memory,visibility,allow_messages) on public.rb_memorials to authenticated;
-- Photos: private until approved; uploads must be associated with authenticated owners.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('rb-memorial-photos','rb-memorial-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "rb_owner_upload_photo" on storage.objects for insert to authenticated
with check (bucket_id='rb-memorial-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "rb_owner_read_photo" on storage.objects for select to authenticated
using (bucket_id='rb-memorial-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Never expose the private bucket publicly. A trusted backend must issue time-limited
-- signed URLs only after checking memorial status, visibility, and ownership.
-- Admin review and unlisted-link access MUST be implemented via authenticated server functions.
