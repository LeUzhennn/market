// ============================================================
// product-detail.js — 商品詳情頁邏輯 (product.html)
// ============================================================

/** 從 URL 取得商品 ID 並載入資料 */
async function loadProduct() {
    const params    = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        showNotFound();
        return;
    }

    try {
        const { data: product, error } = await db
            .from('products')
            .select('*, product_images(id, image_url, sort_order)')
            .eq('id', productId)
            .maybeSingle();

        if (error) {
            console.error('查詢商品失敗:', error);
            showNotFound();
            return;
        }
        if (!product) {
            showNotFound();
            return;
        }

        renderProduct(product);
    } catch (err) {
        console.error(err);
        showNotFound();
    }
}

/** 渲染商品詳情 */
function renderProduct(product) {
    const images = [...(product.product_images || [])]
        .sort((a, b) => a.sort_order - b.sort_order);

    // 隱藏 loading，顯示內容
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('content').classList.remove('d-none');

    // 頁面標題 & 麵包屑
    document.title = product.title + ' — ' + SITE_NAME;
    document.getElementById('breadcrumbTitle').textContent = product.title;

    // ── 圖片輪播 ──
    const carouselInner     = document.getElementById('carouselInner');
    const carouselIndicators = document.getElementById('carouselIndicators');

    if (images.length > 0) {
        carouselInner.innerHTML = images
            .filter(img => safeImageUrl(img.image_url))
            .map((img, i) => `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <img src="${escapeAttr(safeImageUrl(img.image_url))}"
                     class="d-block w-100 detail-carousel-img"
                     alt="${escapeAttr(product.title)} 圖片 ${i + 1}">
            </div>
        `).join('');

        if (images.length > 1) {
            carouselIndicators.innerHTML = images.map((_, i) => `
                <button type="button"
                        data-bs-target="#productCarousel"
                        data-bs-slide-to="${i}"
                        class="${i === 0 ? 'active' : ''}"
                        aria-label="圖片 ${i + 1}"></button>
            `).join('');
        }

        // 圖片超過 1 張時才顯示箭頭
        document.getElementById('carouselPrev').style.display = images.length > 1 ? '' : 'none';
        document.getElementById('carouselNext').style.display = images.length > 1 ? '' : 'none';
    } else {
        document.getElementById('carouselWrapper').innerHTML = `
            <div class="d-flex align-items-center justify-content-center bg-light rounded-3"
                 style="height:300px; font-size:5rem; color:#cbd5e1;">
                📦
            </div>`;
    }

    // ── 商品資訊 ──
    document.getElementById('productTitle').textContent    = product.title;
    document.getElementById('productCategory').textContent = product.category;
    document.getElementById('productPrice').textContent    =
        'NT$ ' + Number(product.price).toLocaleString();
    document.getElementById('productQty').textContent      = product.quantity;
    document.getElementById('productDesc').textContent     =
        product.description || '（賣家未填寫說明）';

    // ── 狀態 & FB 按鈕 ──
    const statusEl = document.getElementById('productStatus');
    const fbBtn    = document.getElementById('fbBtn');
    const soldBanner = document.getElementById('soldBanner');

    if (product.status === 'sold') {
        statusEl.innerHTML = '<span class="badge bg-danger px-3 py-2 fs-6">已售出</span>';
        fbBtn.style.display = 'none';
        soldBanner.classList.remove('d-none');
    } else {
        statusEl.innerHTML = '<span class="badge bg-success px-3 py-2 fs-6">販售中</span>';
        fbBtn.href = FB_MESSENGER_URL;
        soldBanner.classList.add('d-none');
    }
}

/** 顯示找不到商品的畫面 */
function showNotFound() {
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('notFound').classList.remove('d-none');
}

// ── 工具函式 ──

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
    document.querySelectorAll('.site-name').forEach(el => {
        el.textContent = SITE_NAME;
    });
    loadProduct();
});
