// ============================================================
// login.js — 管理員登入頁邏輯 (admin/login.html)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 若已登入，直接跳轉
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
        return;
    }

    const form         = document.getElementById('loginForm');
    const btnLogin     = document.getElementById('btnLogin');
    const alertError   = document.getElementById('alertError');
    const togglePwdBtn = document.getElementById('togglePassword');
    const pwdInput     = document.getElementById('inputPassword');

    // 顯示/隱藏密碼
    togglePwdBtn.addEventListener('click', () => {
        const isHidden = pwdInput.type === 'password';
        pwdInput.type  = isHidden ? 'text' : 'password';
        togglePwdBtn.textContent = isHidden ? '🙈' : '👁';
    });

    // 登入
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('inputEmail').value.trim();
        const password = pwdInput.value;

        if (!email || !password) {
            showError('請填寫 Email 和密碼');
            return;
        }

        btnLogin.disabled  = true;
        btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>登入中…';
        alertError.classList.add('d-none');

        const { error } = await db.auth.signInWithPassword({ email, password });

        if (error) {
            showError('帳號或密碼錯誤，請重試');
            btnLogin.disabled    = false;
            btnLogin.textContent = '登入後台';
            return;
        }

        // 登入成功
        window.location.href = 'dashboard.html';
    });

    function showError(message) {
        alertError.textContent = message;
        alertError.classList.remove('d-none');
    }
});
