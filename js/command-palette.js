export function initCommandPalette() {
    // Create HTML for Palette
    const paletteHTML = `
    <div id="commandPalette" class="command-palette-overlay" style="display: none;">
        <div class="command-palette-box shadow-lg">
            <div class="p-3 border-bottom border-secondary">
                <input type="text" id="paletteInput" class="form-control bg-transparent border-0 text-white shadow-none" placeholder="اكتب أمراً... (مثلاً: إضافة منتج، الطلبات، اشتراك)" autocomplete="off">
            </div>
            <div id="paletteResults" class="palette-results list-group list-group-flush">
                <!-- Results here -->
            </div>
            <div class="p-2 border-top border-secondary text-center">
                <small class="text-white-50">اضغط ESC للإغلاق • استخدم الأسهم للتنقل</small>
            </div>
        </div>
    </div>
    `;

    // Add styles
    const styles = `
    <style>
    .command-palette-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        display: flex; justify-content: center; align-items: flex-start;
        padding-top: 10vh;
        backdrop-filter: blur(5px);
    }
    .command-palette-box {
        width: 600px;
        background: #1a202e;
        border: 1px solid #30363d;
        border-radius: 12px;
        overflow: hidden;
    }
    .palette-results .list-group-item {
        background: transparent;
        border: 0;
        color: white;
        padding: 12px 20px;
        cursor: pointer;
    }
    .palette-results .list-group-item:hover, .palette-results .list-group-item.active {
        background: rgba(255,255,255,0.1);
    }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', paletteHTML);
    document.head.insertAdjacentHTML('beforeend', styles);

    const overlay = document.getElementById('commandPalette');
    const input = document.getElementById('paletteInput');
    const results = document.getElementById('paletteResults');

    const commands = [
        { name: 'المنتجات - الذهاب للقائمة', url: 'products-enhanced.html', icon: 'fa-box' },
        { name: 'إضافة منتج جديد', action: () => document.querySelector('[data-bs-target="#addProductModal"]')?.click(), icon: 'fa-plus' },
        { name: 'الطلبات - عرض كل الطلبات', url: 'orders.html', icon: 'fa-cart-shopping' },
        { name: 'الأقسام - إدارة الفئات', url: 'categories.html', icon: 'fa-tags' },
        { name: 'سجل العمليات -Activity Log', url: 'activity-log.html', icon: 'fa-clock-rotate-left' },
        { name: 'خطط الاشتراك - ترقية الحساب', url: 'subscription.html', icon: 'fa-crown' },
        { name: 'الإعدادات - ضبط المتجر', url: 'settings.html', icon: 'fa-gear' },
        { name: 'تسجيل الخروج', action: () => window.logout(), icon: 'fa-right-from-bracket' }
    ];

    function togglePalette() {
        if (overlay.style.display === 'none') {
            overlay.style.display = 'flex';
            input.value = '';
            input.focus();
            showCommands('');
        } else {
            overlay.style.display = 'none';
        }
    }

    function showCommands(term) {
        const filtered = commands.filter(c => c.name.includes(term));
        results.innerHTML = filtered.map((c, i) => `
            <div class="list-group-item d-flex align-items-center" data-index="${i}">
                <i class="fa-solid ${c.icon} me-3 text-info"></i>
                <span>${c.name}</span>
            </div>
        `).join('');

        // Handle clicks
        results.querySelectorAll('.list-group-item').forEach((item, i) => {
            item.onclick = () => {
                const cmd = filtered[i];
                if (cmd.url) window.location.href = cmd.url;
                if (cmd.action) cmd.action();
                overlay.style.display = 'none';
            };
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            togglePalette();
        }
        if (e.key === 'Escape') overlay.style.display = 'none';
    });

    input.addEventListener('input', (e) => showCommands(e.target.value));
}
