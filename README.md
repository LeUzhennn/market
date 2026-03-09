# 二手市集

純靜態二手市集拍賣網站，使用 HTML + Bootstrap 5 + Supabase，可直接部署至 GitHub Pages。

## 功能

- **公開頁面**：瀏覽商品列表、搜尋、分類篩選、查看商品詳情
- **聯絡方式**：商品詳情頁提供 Facebook 私訊按鈕
- **管理後台**：管理員登入後可新增、編輯、刪除商品，上傳多張圖片，標記售出狀態
- **響應式設計**：專為行動裝置優化，包含觸控友善按鈕、卡片式管理列表與 iOS 安全區域適配
- **無金流**：純展示網站，交易在 Facebook 上完成

---

## 快速開始

### Step 1 — 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) 免費註冊並建立新專案
2. 進入 **SQL Editor**，貼上 `supabase-setup.sql` 的內容並執行
3. 前往 **Authentication → Users → Add user**，建立管理員帳號（Email + 密碼）

### Step 2 — 填入設定

編輯 `js/config.js`，填入以下三項：

```js
const SUPABASE_URL    = 'https://xxxx.supabase.co';     // Dashboard → Settings → API
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';              // 同上（anon public key）
const FB_MESSENGER_URL  = 'https://m.me/你的粉絲頁名稱';
```

> **安全說明**：`SUPABASE_ANON_KEY` 是公開金鑰，設計上就是要放在前端。資料的讀寫權限由 Supabase RLS 規則控制，請勿在此填入 `service_role` key。

### Step 3 — 部署到 GitHub Pages

1. 建立 GitHub Repository（Public）
2. 將此專案所有檔案 push 到 `main` branch
3. 前往 Repository → **Settings → Pages**
4. Source 選擇 `main` branch，根目錄 `/`，點擊 Save
5. 等待約 1 分鐘，即可透過 `https://你的帳號.github.io/repo名稱/` 訪問

---

## 目錄結構

```
market/
├── index.html              # 商品列表（公開）
├── product.html            # 商品詳情（公開）
├── admin/
│   ├── login.html          # 管理員登入
│   └── dashboard.html      # 管理後台（CRUD）
├── css/
│   └── style.css           # 全域樣式
├── js/
│   ├── config.js           # ⭐ 設定檔（需填入）
│   ├── supabase-client.js  # Supabase 初始化
│   ├── products.js         # 商品列表邏輯
│   ├── product-detail.js   # 商品詳情邏輯
│   └── admin.js            # 後台管理邏輯
├── supabase-setup.sql      # 資料庫初始化 SQL
└── README.md
```

---

## 管理後台使用方式

1. 訪問 `你的網址/admin/login.html`
2. 輸入在 Supabase 建立的管理員 Email 與密碼
3. 進入後台後可：
   - **新增商品**：填寫名稱、分類、售價、數量、描述，上傳圖片
   - **編輯商品**：修改任何欄位，新增或刪除圖片
   - **標記售出**：商品售出後點擊「標記售出」，前台將顯示已售出標籤
   - **重新上架**：已售出商品可點擊「重新上架」
   - **刪除商品**：永久刪除商品與圖片

---

## 商品分類設定

在 `js/config.js` 修改 `CATEGORIES` 陣列可自訂分類：

```js
const CATEGORIES = ['衣物', '3C', '家具', '書籍', '玩具', '運動器材', '其他'];
```

---

## 技術棧

| 層面 | 技術 |
|------|------|
| 前端 | HTML5 + Bootstrap 5.3 + Vanilla JS |
| 資料庫 | Supabase (PostgreSQL) |
| 圖片儲存 | Supabase Storage |
| 認證 | Supabase Auth |
| 部署 | GitHub Pages |
