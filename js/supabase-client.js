// Supabase 客戶端初始化（依賴 js/config.js）
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
