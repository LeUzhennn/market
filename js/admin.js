// ============================================================
// admin.js — 後台管理邏輯 (admin/dashboard.html)
// ============================================================

let editingProductId = null;  // null = 新增模式，否則為編輯的商品 ID
let newImageFiles   = [];     // 待上傳的 File 物件陣列（空位設為 null）
let existingImages  = [];     // 編輯模式下目前已有的圖片
let deletedImageIds = [];     // 編輯時要刪除的圖片 ID

// ── 認證 ──

/** 頁面載入時驗證登入狀態 */
async function checkAuth() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/** 登出 */
async function logout() {
    await db.auth.signOut();
    window.location.href = 'login.html';
}

// ── 商品資料 ──

/** 載入所有商品（管理員可看全部狀態） */
async function loadAllProducts() {
    const tbody   = document.getElementById('productsTableBody');
    const emptyEl = document.getElementById('emptyProducts');

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>載入中…
            </td>
        </tr>`;

    const { data: products, error } = await db
        .from('products')
        .select('*, product_images(id, image_url, sort_order)')
        .order('created_at', { ascending: false });

    if (error) {
        showToast('載入商品失敗：' + error.message, 'danger');
        return;
    }

    updateStats(products || []);
    renderAdminTable(products || []);
}

/** 更新統計數字 */
function updateStats(products) {
    const total     = products.length;
    const available = products.filter(p => p.status === 'available').length;
    const sold      = products.filter(p => p.status === 'sold').length;

    document.getElementById('statTotal').textContent     = total;
    document.getElementById('statAvailable').textContent = available;
    document.getElementById('statSold').textContent      = sold;
}

/** 渲染商品管理列表 */
function renderAdminTable(products) {
    const tbody   = document.getElementById('productsTableBody');
    const emptyEl = document.getElementById('emptyProducts');

    if (products.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('d-none');
        return;
    }

    emptyEl.classList.add('d-none');

    tbody.innerHTML = products.map(p => {
        const images    = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
        const firstImg  = images[0];
        const isAvailable = p.status === 'available';

        return `
        <tr>
            <td data-label="圖片">
                ${firstImg && safeImageUrl(firstImg.image_url)
                    ? `<img src="${escapeAttr(safeImageUrl(firstImg.image_url))}"
                            class="admin-thumb" alt="${escapeAttr(p.title)}">`
                    : `<div class="admin-thumb d-flex align-items-center justify-content-center
                               bg-light text-muted" style="font-size:1.4rem">📦</div>`
                }
            </td>
            <td data-label="商品名稱">
                <div class="fw-600">${escapeHtml(p.title)}</div>
                <span class="category-tag">${escapeHtml(p.category)}</span>
            </td>
            <td data-label="售價" class="text-danger fw-700">NT$ ${Number(p.price).toLocaleString()}</td>
            <td data-label="數量">${Number(p.quantity)}</td>
            <td data-label="狀態">
                <span class="badge ${isAvailable ? 'bg-success' : 'bg-secondary'}">
                    ${isAvailable ? '販售中' : '已售出'}
                </span>
            </td>
            <td data-label="操作">
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-outline-warning admin-action-btn"
                            data-action="edit" data-id="${escapeAttr(p.id)}">
                        ✏️ 編輯
                    </button>
                    <button class="btn btn-sm btn-outline-${isAvailable ? 'secondary' : 'success'} admin-action-btn"
                            data-action="toggle" data-id="${escapeAttr(p.id)}" data-status="${escapeAttr(p.status)}">
                        ${isAvailable ? '🏷️ 標記售出' : '🔄 重新上架'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger admin-action-btn"
                            data-action="delete" data-id="${escapeAttr(p.id)}" data-title="${escapeAttr(p.title)}">
                        🗑️ 刪除
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── 新增 / 編輯 Modal ──

/** 開啟新增商品 Modal */
function openAddModal() {
    editingProductId = null;
    newImageFiles    = [];
    existingImages   = [];
    deletedImageIds  = [];

    document.getElementById('productForm').reset();
    document.getElementById('newImgPreview').innerHTML   = '';
    document.getElementById('existingImgsGrid').innerHTML = '';
    document.getElementById('existingImgsSection').classList.add('d-none');
    document.getElementById('modalTitle').textContent    = '新增商品';
    document.getElementById('btnSave').textContent       = '新增商品';

    getModal().show();
}

/** 開啟編輯商品 Modal */
async function openEditModal(productId) {
    editingProductId = productId;
    newImageFiles    = [];
    deletedImageIds  = [];

    const { data: product, error } = await db
        .from('products')
        .select('*, product_images(id, image_url, sort_order)')
        .eq('id', productId)
        .single();

    if (error || !product) {
        showToast('載入商品資料失敗', 'danger');
        return;
    }

    // 填入表單
    document.getElementById('fieldTitle').value       = product.title;
    document.getElementById('fieldDescription').value = product.description || '';
    document.getElementById('fieldPrice').value       = product.price;
    document.getElementById('fieldQuantity').value    = product.quantity;
    document.getElementById('fieldCategory').value    = product.category;
    document.getElementById('fieldStatus').value      = product.status;
    document.getElementById('newImgPreview').innerHTML = '';

    // 顯示現有圖片
    existingImages = [...(product.product_images || [])]
        .sort((a, b) => a.sort_order - b.sort_order);
    renderExistingImages();

    document.getElementById('modalTitle').textContent = '編輯商品';
    document.getElementById('btnSave').textContent    = '儲存變更';
    getModal().show();
}

/** 渲染編輯模式下既有的圖片 */
function renderExistingImages() {
    const section = document.getElementById('existingImgsSection');
    const grid    = document.getElementById('existingImgsGrid');

    if (existingImages.length === 0) {
        section.classList.add('d-none');
        return;
    }

    section.classList.remove('d-none');
    grid.innerHTML = existingImages.map(img => `
        <div class="img-preview-item" id="existing-${escapeAttr(img.id)}">
            <img src="${escapeAttr(safeImageUrl(img.image_url))}" alt="商品圖片">
            <button class="remove-img-btn" title="刪除此圖片"
                    data-action="remove-existing" data-img-id="${escapeAttr(img.id)}">✕</button>
        </div>
    `).join('');
}

/** 標記既有圖片待刪除（僅從畫面移除，送出才刪除 DB） */
function markImageDeleted(imgId) {
    deletedImageIds.push(imgId);
    existingImages = existingImages.filter(i => i.id !== imgId);
    document.getElementById(`existing-${imgId}`)?.remove();

    if (existingImages.length === 0) {
        document.getElementById('existingImgsSection').classList.add('d-none');
    }
}

/** 處理新圖片選擇 */
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    const grid  = document.getElementById('newImgPreview');

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const idx = newImageFiles.length;
        newImageFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'img-preview-item';
            item.id = `new-img-${idx}`;
            item.innerHTML = `
                <img src="${escapeAttr(e.target.result)}" alt="預覽">
                <button class="remove-img-btn" title="移除"
                        data-action="remove-new" data-idx="${idx}">✕</button>`;
            grid.appendChild(item);
        };
        reader.readAsDataURL(file);
    });

    // 清空 input，讓同一檔案可以再次選擇
    event.target.value = '';
}

/** 移除待上傳圖片 */
function removeNewImage(idx) {
    newImageFiles[idx] = null;
    document.getElementById(`new-img-${idx}`)?.remove();
}

// ── 儲存商品 ──

/** 儲存（新增或編輯） */
async function saveProduct() {
    const title       = document.getElementById('fieldTitle').value.trim();
    const description = document.getElementById('fieldDescription').value.trim();
    const price       = parseInt(document.getElementById('fieldPrice').value, 10);
    const quantity    = parseInt(document.getElementById('fieldQuantity').value, 10);
    const category    = document.getElementById('fieldCategory').value;
    const status      = document.getElementById('fieldStatus').value;

    // 基本驗證
    if (!title) {
        showToast('請填寫商品名稱', 'warning');
        document.getElementById('fieldTitle').focus();
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('請輸入有效的價格', 'warning');
        document.getElementById('fieldPrice').focus();
        return;
    }
    if (isNaN(quantity) || quantity < 0) {
        showToast('請輸入有效的數量', 'warning');
        document.getElementById('fieldQuantity').focus();
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>儲存中…';

    try {
        let productId = editingProductId;
        const now     = new Date().toISOString();
        const payload = { title, description, price, quantity, category, status, updated_at: now };

        if (editingProductId) {
            // 更新
            const { error } = await db.from('products')
                .update(payload)
                .eq('id', editingProductId);
            if (error) throw error;
        } else {
            // 新增
            const { data, error } = await db.from('products')
                .insert({ ...payload, created_at: now })
                .select()
                .single();
            if (error) throw error;
            productId = data.id;
        }

        // 刪除被標記的圖片
        if (deletedImageIds.length > 0) {
            await db.from('product_images').delete().in('id', deletedImageIds);
        }

        // 上傳新圖片
        const filesToUpload = newImageFiles.filter(f => f !== null);
        const baseOrder     = existingImages.length;

        for (let i = 0; i < filesToUpload.length; i++) {
            const file     = filesToUpload[i];
            const ext      = file.name.split('.').pop().toLowerCase();
            const safeName = `${Date.now()}-${i}.${ext}`;
            const filePath = `${productId}/${safeName}`;

            const { error: uploadErr } = await db.storage
                .from('product-images')
                .upload(filePath, file, { upsert: true });
            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = db.storage
                .from('product-images')
                .getPublicUrl(filePath);

            const { error: imgErr } = await db.from('product_images').insert({
                product_id: productId,
                image_url:  publicUrl,
                sort_order: baseOrder + i,
            });
            if (imgErr) throw imgErr;
        }

        getModal().hide();
        showToast(editingProductId ? '商品已更新！' : '商品已成功新增！', 'success');
        loadAllProducts();
    } catch (err) {
        console.error(err);
        showToast('儲存失敗：' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.textContent = editingProductId ? '儲存變更' : '新增商品';
    }
}

// ── 其他操作 ──

/** 切換販售狀態 */
async function toggleStatus(productId, currentStatus) {
    const newStatus = currentStatus === 'available' ? 'sold' : 'available';
    const { error } = await db.from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', productId);

    if (error) {
        showToast('操作失敗：' + error.message, 'danger');
        return;
    }
    showToast(newStatus === 'sold' ? '已標記為售出' : '已重新上架', 'success');
    loadAllProducts();
}

/** 刪除確認 */
function confirmDelete(productId, title) {
    document.getElementById('deleteProductName').textContent = title;
    document.getElementById('btnConfirmDelete').onclick = () => deleteProduct(productId);
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

/** 刪除商品 */
async function deleteProduct(productId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    modal.hide();

    const { error } = await db.from('products').delete().eq('id', productId);
    if (error) {
        showToast('刪除失敗：' + error.message, 'danger');
        return;
    }
    showToast('商品已刪除', 'success');
    loadAllProducts();
}

// ── 工具函式 ──

function getModal() {
    const modalEl = document.getElementById('productModal');
    return bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const id        = 'toast-' + Date.now();
    const bgMap     = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning text-dark' };
    const bg        = bgMap[type] || 'bg-success';

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-white ${bg} border-0"
             role="alert" aria-live="assertive">
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"></button>
            </div>
        </div>`);

    const toastEl = document.getElementById(id);
    const toast   = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

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

/** 填入分類下拉選單 */
function setupCategorySelect() {
    const select = document.getElementById('fieldCategory');
    select.innerHTML = CATEGORIES.map(c =>
        `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
    ).join('');
}

// ── 初始化 ──

document.addEventListener('DOMContentLoaded', async () => {
    // 驗證登入
    const ok = await checkAuth();
    if (!ok) return;

    // 隱藏 auth check overlay
    document.getElementById('authChecking').classList.add('d-none');
    document.getElementById('dashboardContent').classList.remove('d-none');

    // 套用設定
    document.querySelectorAll('.site-name').forEach(el => {
        el.textContent = SITE_NAME;
    });

    setupCategorySelect();
    loadAllProducts();

    // 按鈕事件
    document.getElementById('btnAddProduct').addEventListener('click', openAddModal);
    document.getElementById('btnSave').addEventListener('click', saveProduct);
    document.getElementById('btnLogout').addEventListener('click', logout);
    document.getElementById('imageInput').addEventListener('change', handleImageSelect);

    // 表格操作按鈕：event delegation
    document.getElementById('productsTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const { action, id, status, title } = btn.dataset;
        if (action === 'edit')   openEditModal(id);
        if (action === 'toggle') toggleStatus(id, status);
        if (action === 'delete') confirmDelete(id, title);
    });

    // 現有圖片刪除：event delegation
    document.getElementById('existingImgsGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="remove-existing"]');
        if (!btn) return;
        markImageDeleted(btn.dataset.imgId);
    });

    // 新圖片預覽刪除：event delegation
    document.getElementById('newImgPreview').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="remove-new"]');
        if (!btn) return;
        removeNewImage(parseInt(btn.dataset.idx, 10));
    });
});
