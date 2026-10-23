-- Glamor & Grace product photo gallery
-- Run this once in Supabase SQL Editor before deploying the matching site code.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS product_images JSONB NOT NULL DEFAULT '[]'::JSONB;
