// ============================================================
// products.js — 商品列表頁邏輯 (index.html)
// ============================================================

let allProducts = [];
let currentCategory = '全部';
let searchQuery = '';

/** 從 Supabase 載入所有上架商品 */
async function loadProducts() {
    const loadingEl = document.getElementById('loadingState');
    const errorEl   = document.getElementById('errorState');

    try {
        const { data, error } = await db
            .from('products')
            .select('*, product_images(image_url, sort_order)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = data || [];
        loadingEl.classList.add('d-none');
        renderProducts();
    } catch (err) {
        console.error('載入商品失敗:', err);
        loadingEl.classList.add('d-none');
        errorEl.classList.remove('d-none');
    }
}

/** 根據目前篩選條件渲染商品卡片 */
function renderProducts() {
    const grid     = document.getElementById('productGrid');
    const emptyEl  = document.getElementById('emptyState');
    const countEl  = document.getElementById('productCount');

    let filtered = allProducts;

    // 篩選：只顯示上架商品（public 也只能讀到 available，這裡再做一層保護）
    filtered = filtered.filter(p => p.status === 'available');

    // 篩選分類
    if (currentCategory !== '全部') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    // 搜尋
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
    }

    countEl.textContent = `共 ${filtered.length} 件商品`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyEl.classList.remove('d-none');
        return;
    }

    emptyEl.classList.add('d-none');

    grid.innerHTML = filtered.map(product => {
        const images = [...(product.product_images || [])]
            .sort((a, b) => a.sort_order - b.sort_order);
        const firstImage = images[0];

        return `
        <div class="col-6 col-md-4 col-lg-3 mb-4">
            <a class="product-card text-decoration-none"
               href="product.html?id=${escapeAttr(product.id)}">
                <div class="product-img-wrapper">
                    ${firstImage && safeImageUrl(firstImage.image_url)
                        ? `<img src="${escapeAttr(safeImageUrl(firstImage.image_url))}"
                                alt="${escapeAttr(product.title)}"
                                loading="lazy">`
                        : `<span class="no-image-icon">📦</span>`
                    }
                    ${product.status === 'sold' ? `
                    <div class="sold-overlay">
                        <span class="sold-badge-text">已售出</span>
                    </div>` : ''}
                </div>
                <div class="product-card-body">
                    <span class="category-tag">${escapeHtml(product.category)}</span>
                    <div class="product-title">${escapeHtml(product.title)}</div>
                    <div class="product-price">NT$ ${Number(product.price).toLocaleString()}</div>
                    <div class="product-qty">數量：${product.quantity}</div>
                </div>
            </a>
        </div>`;
    }).join('');
}

/** 建立分類 Pills */
function setupCategoryPills() {
    const container = document.getElementById('categoryPills');
    const allCats   = ['全部', ...CATEGORIES];

    container.innerHTML = allCats.map(cat => `
        <button class="category-pill ${cat === '全部' ? 'active' : ''}"
                onclick="filterByCategory('${escapeAttr(cat)}')">
            ${escapeHtml(cat)}
        </button>
    `).join('');
}

/** 切換分類 */
function filterByCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.toggle('active', pill.textContent.trim() === category);
    });
    renderProducts();
}

/** 設定搜尋事件 */
function setupSearch() {
    const input = document.getElementById('searchInput');
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = input.value.trim();
            renderProducts();
        }, 300);
    });

    // Enter 鍵觸發
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            searchQuery = input.value.trim();
            renderProducts();
        }
    });

    document.getElementById('btnSearch').addEventListener('click', () => {
        clearTimeout(debounceTimer);
        searchQuery = input.value.trim();
        renderProducts();
    });
}

// ── 工具函式 ──

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 驗證圖片 URL 只允許 https:// 開頭，防止 javascript: 或其他 scheme */
function safeImageUrl(url) {
    if (!url) return '';
    return String(url).startsWith('https://') ? url : '';
}

// ── 初始化 ──

document.addEventListener('DOMContentLoaded', () => {
    // 套用設定
    document.querySelectorAll('.site-name').forEach(el => {
        el.textContent = SITE_NAME;
    });
    document.title = SITE_NAME + ' — 精選二手好物';

    setupCategoryPills();
    setupSearch();
    loadProducts();
});
