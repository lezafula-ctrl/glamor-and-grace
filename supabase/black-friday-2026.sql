-- Glamor & Grace: Black Friday 2026 campaign
-- Run this file in the Supabase SQL Editor before enabling the sale.
-- The campaign ends at midnight on 30 November (South African time),
-- so the sale covers all of 23-29 November 2026.

create table if not exists public.store_promotions (
    id smallint primary key default 1 check (id = 1),
    name text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    enabled boolean not null default false,
    category_discounts jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint store_promotions_valid_window check (ends_at > starts_at),
    constraint store_promotions_valid_discounts check (jsonb_typeof(category_discounts) = 'object')
);

alter table public.store_promotions enable row level security;

drop policy if exists "Public can read promotion settings" on public.store_promotions;
create policy "Public can read promotion settings"
on public.store_promotions for select
to anon, authenticated
using (true);

drop policy if exists "Store admins can manage promotion settings" on public.store_promotions;
create policy "Store admins can manage promotion settings"
on public.store_promotions for all
to authenticated
using (exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.role in ('owner','staff')
))
with check (exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.role in ('owner','staff')
));

insert into public.store_promotions (
    id, name, starts_at, ends_at, enabled, category_discounts
) values (
    1,
    'Pink & Black Friday 2026',
    '2026-11-23 00:00:00+02',
    '2026-11-30 00:00:00+02',
    true,
    '{
      "Sneakers": 10,
      "Human Hair Wigs": 20,
      "Human Blend Wigs": 20,
      "Bags": 30,
      "Dresses": 20,
      "Shoes": 20,
      "Accessories": 30,
      "Swim & Beachwear": 10,
      "Gifts": 20,
      "Home Appliances": 10,
      "Stationery": 20,
      "Sportswear": 20,
      "Sleepwear": 10,
      "Women Comfies": 10,
      "Elegancies": 10
    }'::jsonb
)
on conflict (id) do update set
    name = excluded.name,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    enabled = excluded.enabled,
    category_discounts = excluded.category_discounts,
    updated_at = now();

create or replace function public.gg_black_friday_discount(p_category text)
returns numeric
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
    v_discount numeric := 0;
begin
    select coalesce((category_discounts ->> coalesce(p_category, ''))::numeric, 0)
      into v_discount
      from public.store_promotions
     where id = 1
       and enabled = true
       and now() >= starts_at
       and now() < ends_at;

    return greatest(0, least(100, coalesce(v_discount, 0)));
exception when others then
    return 0;
end;
$$;

revoke all on function public.gg_black_friday_discount(text) from public;
grant execute on function public.gg_black_friday_discount(text) to anon, authenticated;

-- Glamor & Grace: secure, atomic order creation
-- Run this once in Supabase SQL Editor. This does not alter products or stock.

create or replace function public.create_store_order(p_order jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_order_id uuid;
    v_item jsonb;
    v_product public.products%rowtype;
    v_quantity integer;
    v_subtotal numeric(12,2) := 0;
    v_delivery_fee numeric(12,2);
    v_delivery_method text;
    v_unit_price numeric(12,2);
    v_product_id text;
    v_selected jsonb;
    v_variant_match boolean;
begin
    if jsonb_typeof(p_order) <> 'object' then
        raise exception 'Invalid order details.';
    end if;

    if length(trim(coalesce(p_order->>'first_name',''))) not between 1 and 100
       or length(trim(coalesce(p_order->>'surname',''))) not between 1 and 100
       or length(trim(coalesce(p_order->>'phone',''))) not between 5 and 40
       or length(trim(coalesce(p_order->>'email',''))) not between 3 and 254
       or length(trim(coalesce(p_order->>'delivery_details',''))) not between 3 and 1000 then
        raise exception 'Please check your customer and delivery details.';
    end if;

    v_delivery_method := p_order->>'delivery_method';
    v_delivery_fee := case v_delivery_method
        when 'paxi' then 150
        when 'paxi-large' then 200
        when 'courier' then 200
        when 'courier-large' then 250
        else null
    end;
    if v_delivery_fee is null then
        raise exception 'Please select a valid delivery method.';
    end if;

    if jsonb_typeof(p_order->'items') <> 'array'
       or jsonb_array_length(p_order->'items') < 1
       or jsonb_array_length(p_order->'items') > 50 then
        raise exception 'Your cart is empty or contains too many items.';
    end if;

    for v_item in select value from jsonb_array_elements(p_order->'items')
    loop
        v_product_id := v_item->>'product_id';
        if v_product_id is null or v_product_id !~ '^[0-9]+$' then
            raise exception 'A product in your cart is invalid.';
        end if;

        v_quantity := (v_item->>'quantity')::integer;
        if v_quantity < 1 or v_quantity > 100 then
            raise exception 'A product quantity is invalid.';
        end if;

        select * into v_product
        from public.products
        where id = v_product_id::bigint;

        if not found then
            raise exception 'A product in your cart is no longer available.';
        end if;
        v_selected := coalesce(v_item->'selected_variants', '{}'::jsonb);
        if jsonb_typeof(v_selected) <> 'object' then
            raise exception 'Product options are invalid.';
        end if;

        -- Validate exact per-variant stock when configured; otherwise use overall stock.
        if jsonb_typeof(v_product.variant_stock) = 'array'
           and jsonb_array_length(v_product.variant_stock) > 0 then
            select exists (
                select 1
                from jsonb_array_elements(v_product.variant_stock) as vs(value)
                where coalesce(vs.value->'options', '{}'::jsonb) =
                      coalesce(v_selected->'options', '{}'::jsonb)
                  and coalesce((vs.value->>'quantity')::integer, 0) >= v_quantity
            ) into v_variant_match;
            if not v_variant_match then
                raise exception 'The selected option or its stock is no longer available for %.', coalesce(v_product.name, 'a product');
            end if;
        elsif coalesce(v_product.stock, 0) < v_quantity then
            raise exception 'There is not enough stock for %.', coalesce(v_product.name, 'a product');
        end if;

        -- A selected option may override the base product price (e.g. wig length).
        v_unit_price := null;
        select nullif(variant.value->'prices'->>(v_selected->'options'->>(variant.value->>'name')), '')::numeric
          into v_unit_price
          from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) as variant(value)
         where v_selected->'options' ? (variant.value->>'name')
           and coalesce(variant.value->'prices', '{}'::jsonb) ? (v_selected->'options'->>(variant.value->>'name'))
         limit 1;
        v_unit_price := round(
            coalesce(v_unit_price, v_product.price)::numeric *
            (1 - public.gg_black_friday_discount(v_product.category) / 100.0),
            2
        );
        if v_unit_price is null or v_unit_price < 0 then
            raise exception 'A product price is invalid.';
        end if;
        v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    end loop;

    if v_subtotal < 150 then
        raise exception 'The minimum order amount is R150.';
    end if;

    insert into public.orders (
        first_name, surname, phone, whatsapp, email,
        delivery_details, delivery_method, subtotal, delivery_fee, total,
        order_status, payment_status
    ) values (
        trim(p_order->>'first_name'),
        trim(p_order->>'surname'),
        trim(p_order->>'phone'),
        nullif(trim(coalesce(p_order->>'whatsapp','')), ''),
        lower(trim(p_order->>'email')),
        trim(p_order->>'delivery_details'),
        v_delivery_method,
        v_subtotal,
        v_delivery_fee,
        v_subtotal + v_delivery_fee,
        'pending',
        'pending'
    ) returning id into v_order_id;

    for v_item in select value from jsonb_array_elements(p_order->'items')
    loop
        v_product_id := v_item->>'product_id';
        v_quantity := (v_item->>'quantity')::integer;

        select * into v_product
        from public.products
        where id = v_product_id::bigint;

        v_selected := coalesce(v_item->'selected_variants', '{}'::jsonb);
        v_unit_price := null;
        select nullif(variant.value->'prices'->>(v_selected->'options'->>(variant.value->>'name')), '')::numeric
          into v_unit_price
          from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) as variant(value)
         where v_selected->'options' ? (variant.value->>'name')
           and coalesce(variant.value->'prices', '{}'::jsonb) ? (v_selected->'options'->>(variant.value->>'name'))
         limit 1;
        v_unit_price := round(
            coalesce(v_unit_price, v_product.price)::numeric *
            (1 - public.gg_black_friday_discount(v_product.category) / 100.0),
            2
        );

        insert into public.order_items (
            order_id, product_id, product_name, unit_price, quantity, selected_variants
        ) values (
            v_order_id,
            v_product.id::text,
            coalesce(v_product.name, 'Product'),
            v_unit_price,
            v_quantity,
            v_selected
        );
    end loop;

    return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb) from public;
grant execute on function public.create_store_order(jsonb) to anon, authenticated;

