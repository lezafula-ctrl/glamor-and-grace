create table if not exists public.product_reviews (
 id uuid primary key default gen_random_uuid(),
 product_id text not null,
 product_name text not null,
 reviewer_name text,
 is_anonymous boolean not null default false,
 rating integer not null check (rating between 1 and 5),
 comment text not null check (char_length(trim(comment)) between 5 and 1500),
 photo_urls text[] not null default '{}',
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 constraint product_reviews_photo_limit check (coalesce(array_length(photo_urls,1),0) <= 9)
);
alter table public.product_reviews enable row level security;
drop policy if exists "Anyone can read approved product reviews" on public.product_reviews;
create policy "Anyone can read approved product reviews" on public.product_reviews for select to anon, authenticated using (status='approved');
drop policy if exists "Anyone can submit pending product reviews" on public.product_reviews;
create policy "Anyone can submit pending product reviews" on public.product_reviews for insert to anon, authenticated with check (status='pending' and rating between 1 and 5 and char_length(trim(comment)) between 5 and 1500 and coalesce(array_length(photo_urls,1),0) <= 9);
grant select, insert on public.product_reviews to anon, authenticated;
create index if not exists product_reviews_product_status_created_idx on public.product_reviews(product_id,status,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('review-photos','review-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public can view review photos" on storage.objects;
create policy "Public can view review photos" on storage.objects for select to anon,authenticated using(bucket_id='review-photos');
drop policy if exists "Anyone can upload review photos" on storage.objects;
create policy "Anyone can upload review photos" on storage.objects for insert to anon,authenticated with check(bucket_id='review-photos' and lower(storage.extension(name)) in ('jpg','jpeg','png','webp') and (storage.foldername(name))[1]='submissions');
