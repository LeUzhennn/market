-- ============================================================
-- Supabase 資料庫初始化腳本
-- 使用方式：前往 Supabase Dashboard → SQL Editor → 貼上執行
-- ============================================================


-- ────────────────────────────────────────────
-- 1. 建立資料表
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    title       text        NOT NULL,
    description text        NOT NULL DEFAULT '',
    price       integer     NOT NULL CHECK (price >= 0),
    quantity    integer     NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    category    text        NOT NULL DEFAULT '其他',
    status      text        NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available', 'sold')),
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url   text        NOT NULL,
    sort_order  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);


-- ────────────────────────────────────────────
-- 2. 建立索引（提升查詢效能）
-- ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_status
    ON public.products (status);

CREATE INDEX IF NOT EXISTS idx_products_category
    ON public.products (category);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
    ON public.product_images (product_id);

CREATE INDEX IF NOT EXISTS idx_products_created_at
    ON public.products (created_at DESC);


-- ────────────────────────────────────────────
-- 3. 啟用 Row Level Security (RLS)
-- ────────────────────────────────────────────

ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────
-- 4. products 資料表政策
-- ────────────────────────────────────────────

-- 匿名用戶：只能讀取「販售中」的商品
CREATE POLICY "anon_read_available_products"
    ON public.products
    FOR SELECT
    TO anon
    USING (status = 'available');

-- 已登入用戶（管理員）：可讀取所有商品（含已售出）
CREATE POLICY "auth_read_all_products"
    ON public.products
    FOR SELECT
    TO authenticated
    USING (true);

-- 已登入用戶（管理員）：可新增商品
CREATE POLICY "auth_insert_products"
    ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 已登入用戶（管理員）：可更新商品
CREATE POLICY "auth_update_products"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 已登入用戶（管理員）：可刪除商品
CREATE POLICY "auth_delete_products"
    ON public.products
    FOR DELETE
    TO authenticated
    USING (true);


-- ────────────────────────────────────────────
-- 5. product_images 資料表政策
-- ────────────────────────────────────────────

-- 所有人可讀取圖片
CREATE POLICY "anyone_read_product_images"
    ON public.product_images
    FOR SELECT
    USING (true);

-- 已登入用戶（管理員）：可新增圖片
CREATE POLICY "auth_insert_product_images"
    ON public.product_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 已登入用戶（管理員）：可刪除圖片
CREATE POLICY "auth_delete_product_images"
    ON public.product_images
    FOR DELETE
    TO authenticated
    USING (true);


-- ────────────────────────────────────────────
-- 6. Storage Bucket 與政策
-- ────────────────────────────────────────────

-- 建立公開 Bucket（若已存在則跳過）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880,  -- 5MB 上限
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 所有人可讀取圖片（公開 bucket 已自動允許，此為明確聲明）
CREATE POLICY "storage_public_read"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'product-images');

-- 已登入用戶（管理員）可上傳圖片
CREATE POLICY "storage_auth_upload"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- 已登入用戶（管理員）可更新圖片
CREATE POLICY "storage_auth_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'product-images');

-- 已登入用戶（管理員）可刪除圖片
CREATE POLICY "storage_auth_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-images');


-- ────────────────────────────────────────────
-- 完成！
-- 接下來請至 Supabase Dashboard → Authentication → Users
-- 點擊「Add user」建立管理員帳號
-- ────────────────────────────────────────────
