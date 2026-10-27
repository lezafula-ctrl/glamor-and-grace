-- Glamor & Grace review moderation permissions
-- Run after product-reviews-setup-safe.sql. No existing policies are dropped.
-- Only authenticated users listed as owner/staff in admin_users can change review status/content.

create policy gg_review_v1_staff_moderate
on public.product_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.role in ('owner', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.role in ('owner', 'staff')
  )
);

grant update on public.product_reviews to authenticated;
