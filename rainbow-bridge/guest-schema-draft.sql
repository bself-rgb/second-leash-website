-- Draft: deploy only after review, email configuration, and anti-spam protection.
create table public.rb_guest_submissions(
 id uuid primary key default gen_random_uuid(),
 pet_name text not null check(length(pet_name) between 1 and 100),
 species text not null check(length(species) between 1 and 80),
 tribute text not null check(length(tribute) between 1 and 4000),
 contact_email text not null,
 visibility text not null default 'public' check(visibility in ('public','unlisted')),
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table public.rb_guest_submissions enable row level security;
revoke all on public.rb_guest_submissions from anon,authenticated;
create table public.rb_review_tokens(
 token_hash text primary key,
 submission_id uuid not null references public.rb_guest_submissions(id) on delete cascade,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.rb_review_tokens enable row level security;
revoke all on public.rb_review_tokens from anon,authenticated;
-- These private tables must be accessible only from trusted Edge Functions.
