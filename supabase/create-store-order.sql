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
        if coalesce(v_product.stock, 0) < v_quantity then
            raise exception 'There is not enough stock for %.', coalesce(v_product.name, 'a product');
        end if;

        v_selected := coalesce(v_item->'selected_variants', '{}'::jsonb);
        if jsonb_typeof(v_selected) <> 'object' then
            raise exception 'Product options are invalid.';
        end if;

        -- If the product uses per-variant stock, require an exact selected variant
        -- and verify its available quantity. No stock is deducted here.
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
        end if;

        v_unit_price := round(v_product.price::numeric, 2);
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

        insert into public.order_items (
            order_id, product_id, product_name, unit_price, quantity, selected_variants
        ) values (
            v_order_id,
            v_product.id::text,
            coalesce(v_product.name, 'Product'),
            round(v_product.price::numeric, 2),
            v_quantity,
            v_selected
        );
    end loop;

    return v_order_id;
end;
$$;

revoke all on function public.create_store_order(jsonb) from public;
grant execute on function public.create_store_order(jsonb) to anon, authenticated;
