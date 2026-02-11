import { auth, db, storage, collection, doc, getDoc, setDoc, query, where, signOut, onAuthStateChanged, addDoc, serverTimestamp, updateDoc, ref, uploadBytes, getDownloadURL } from './firebase-config.js';
import { supabase, supabaseData } from './supabase-config.js';
import { ROLES, hasPermission } from './roles.js';
import { initCommandPalette } from './command-palette.js';

// Global System State
window.currentUserData = null;
window.currentStoreId = localStorage.getItem('activeStoreId') || 'default';

// Init UI Features
applyUIDensity();
initCommandPalette();

// --- OBSERVABILITY: Global Error Tracking ---
window.onerror = async function (msg, url, lineNo, columnNo, error) {
    if (window.db) {
        try {
            await addDoc(collection(db, "incidents"), {
                storeId: window.currentStoreId || 'default',
                title: `Auto-Error: ${msg}`,
                severity: 'medium',
                status: 'open',
                details: { url, lineNo, columnNo, stack: error?.stack },
                timestamp: serverTimestamp(),
                type: 'system_error'
            });
        } catch (e) {
            console.error('Failed to log auto-error:', e);
        }
    }
    return false;
};

// --- AUTH UI CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    } else {
        console.log('Logged in as:', user.email);

        // Fetch User Metadata (Role, Store, etc)
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                window.currentUserData = userDoc.data();
            } else {
                // Initialize default user if not exists (First Login)
                window.currentUserData = {
                    email: user.email,
                    role: ROLES.ADMIN, // First user is Admin
                    storeId: 'default',
                    subscription: 'free',
                    created_at: serverTimestamp()
                };
                await setDoc(doc(db, "users", user.uid), window.currentUserData);
            }

            // Log access
            console.log('User Role:', window.currentUserData.role);

            // Update UI based on role
            applyRoleRestrictions();

        } catch (error) {
            console.error('Error fetching user metadata:', error);
        }

        // Change displayed email
        const adminEmail = document.querySelector('.user-profile small');
        if (adminEmail) adminEmail.innerText = user.email;

        // Load dashboard stats if on dashboard page
        if (window.location.pathname.endsWith('dashboard.html')) {
            loadDashboardStats();
        }
    }
});

// --- ROLE BASED UI ---
function applyRoleRestrictions() {
    if (!window.currentUserData) return;

    const role = window.currentUserData.role;

    // Hide elements based on permissions
    const restrictedElements = document.querySelectorAll('[data-permission]');
    restrictedElements.forEach(el => {
        const permission = el.getAttribute('data-permission');
        if (!hasPermission(role, permission)) {
            el.style.display = 'none';
        }
    });

    // Sidebar protection
    if (role === ROLES.READ_ONLY || role === ROLES.STAFF) {
        const settingsLink = document.querySelector('a[href="settings.html"]');
        if (settingsLink) settingsLink.style.display = 'none';

        const catLink = document.querySelector('a[href="categories.html"]');
        if (catLink && role === ROLES.READ_ONLY) catLink.style.display = 'none';
    }
}

// --- ACTIVITY LOG LOGIC ---
export async function logActivity(action, details = {}) {
    if (!auth.currentUser) return;

    try {
        await addDoc(collection(db, "activity_logs"), {
            userId: auth.currentUser.uid,
            userEmail: auth.currentUser.email,
            userName: window.currentUserData?.name || auth.currentUser.email.split('@')[0],
            role: window.currentUserData?.role || 'unknown',
            action: action,
            details: details,
            storeId: window.currentUserData?.storeId || 'default',
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
window.logActivity = logActivity;

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// --- DASHBOARD STATISTICS ---
async function loadDashboardStats() {
    try {
        // Get Products Count from Supabase
        const { count: productsCount, error: prodError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (prodError) throw prodError;

        const prodEl = document.getElementById('totalProducts');
        if (prodEl) prodEl.innerText = productsCount || 0;

        // Get Orders Count and Total Sales
        const ordersQuery = query(collection(db, "orders"), where("storeId", "==", window.currentStoreId));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersCount = ordersSnapshot.size;
        let totalSales = 0;
        let newOrdersCount = 0;

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'completed') {
                totalSales += order.total_price || 0;
            }
            if (order.status === 'pending') {
                newOrdersCount++;
            }
        });

        const orderEl = document.getElementById('totalOrders');
        if (orderEl) orderEl.innerText = newOrdersCount || ordersCount;

        const salesEl = document.getElementById('totalSales');
        if (salesEl) salesEl.innerText = totalSales.toLocaleString() + ' EGP';

        // Users count (placeholder)
        const userEl = document.getElementById('totalUsers');
        if (userEl) userEl.innerText = '—';

        // Load recent orders in table
        loadRecentOrders(ordersSnapshot);

        // Calculate Smart Insights
        generateSmartInsights(productsSnapshot, ordersSnapshot);

        // Update Goal Tracking
        updateGoalTracking(totalSales);

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function loadRecentOrders(ordersSnapshot) {
    const tableBody = document.getElementById('recentOrdersTable');
    if (!tableBody) return;

    if (ordersSnapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-white-50">لا توجد طلبات حتى الآن</td></tr>';
        return;
    }

    // Get last 5 orders
    const ordersList = [];
    ordersSnapshot.forEach(doc => {
        ordersList.push({ id: doc.id, ...doc.data() });
    });

    // Sort by date (newest first)
    ordersList.sort((a, b) => {
        const aTime = a.created_at?.seconds || 0;
        const bTime = b.created_at?.seconds || 0;
        return bTime - aTime;
    });

    const recentOrders = ordersList.slice(0, 5);

    tableBody.innerHTML = recentOrders.map(order => {
        const date = order.created_at ? new Date(order.created_at.seconds * 1000).toLocaleDateString('ar-EG') : 'N/A';
        let statusBadge = 'bg-warning text-dark';
        let statusText = 'جديد';
        if (order.status === 'completed') {
            statusBadge = 'bg-success';
            statusText = 'مكتمل';
        }
        if (order.status === 'cancelled') {
            statusBadge = 'bg-danger';
            statusText = 'ملغي';
        }

        return `
        <tr>
            <td class="ps-4">#${order.id.substring(0, 8)}</td>
            <td>${order.user_email?.split('@')[0] || 'عميل'}</td>
            <td>${date}</td>
            <td><span class="badge ${statusBadge}">${statusText}</span></td>
            <td class="fw-bold text-success">${order.total_price} EGP</td>
            <td><a href="orders.html" class="btn btn-sm btn-outline-light">عرض</a></td>
        </tr>`;
    }).join('');
}

// --- PRODUCTS LOGIC ---
const productForm = document.getElementById('addProductForm');
if (productForm) {
    // Image Preview
    const imageInput = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> <span id="saveStatusMain">جاري الحفظ...</span>';
        btn.disabled = true;
        const statusEl = document.getElementById('saveStatusMain');

        try {
            const name = document.getElementById('productName').value;
            const price = parseFloat(document.getElementById('productPrice').value);
            const desc = document.getElementById('productDesc').value;
            const imageFile = document.getElementById('productImage').files[0];

            if (!imageFile) {
                throw new Error('الرجاء اختيار صورة المنتج');
            }

            // 1. Upload image to Firebase Storage
            const timestamp = Date.now();
            const imageName = `products/${timestamp}_${imageFile.name}`;
            const storageRef = ref(storage, imageName);

            if (statusEl) statusEl.innerText = 'جاري رفع الصورة...';
            await uploadBytes(storageRef, imageFile);
            const imageUrl = await getDownloadURL(storageRef);

            if (statusEl) statusEl.innerText = 'جاري حفظ البيانات...';

            // 2. Save to Supabase (SQL)
            await supabaseData.addProduct({
                name: name,
                price: price || 0,
                image_url: imageUrl,
                description: desc,
                category: 'general' // يمكنك إضافة اختيار التصنيف لاحقاً
            });

            // Log Activity (Keep this in Firebase for now as an audit log)
            await logActivity('إضافة منتج (Supabase)', { name: name, price: price });

            // Close Modal Safely
            const modalEl = document.getElementById('addProductModal');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modalInstance.hide();
            }

            // Reset Form and Reload
            productForm.reset();
            imagePreview.style.display = 'none';
            Toastify({ text: "تم إضافة المنتج بنجاح!", style: { background: "green" } }).showToast();
            loadProducts();

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'خطأ!',
                text: error.message || 'فشل في إضافة المنتج',
                icon: 'error',
                background: '#1a202e',
                color: '#fff'
            });
        } finally {
            btn.innerHTML = 'حفظ المنتج';
            btn.disabled = false;
        }
    });

    // Initial Load
    loadProducts();
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    try {
        const products = await supabaseData.getProducts();
        grid.innerHTML = '';

        if (!products || products.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-white-50">لا توجد منتجات حالياً.</div>';
            return;
        }

        products.forEach(p => {
            grid.innerHTML += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="product-admin-card h-100 position-relative">
                    <img src="${p.image_url || 'https://via.placeholder.com/300?text=No+Image'}" class="product-admin-img">
                    <div class="p-3">
                        <h6 class="fw-bold text-white mb-1">${p.name}</h6>
                        <div class="text-warning fw-bold mb-3">${p.price} EGP</div>
                        <div class="d-flex gap-2">
                             <button onclick="deleteProduct('${p.id}')" class="btn btn-sm btn-danger w-100">
                                <i class="fa-solid fa-trash me-1"></i> حذف
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        });
    } catch (error) {
        console.error('Supabase Error:', error);
        grid.innerHTML = '<div class="col-12 text-center text-danger">فشل تحميل المنيو من Supabase.</div>';
    }
}

window.deleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        await supabaseData.deleteProduct(id);
        Toastify({ text: "تم الحذف من Supabase بنجاح", style: { background: "orange" } }).showToast();
        loadProducts();
    } catch (error) {
        console.error(error);
        alert('فشل الحذف من Supabase');
    }
};

// --- ORDERS LOGIC ---
const ordersTableBody = document.getElementById('ordersTableBody');
if (ordersTableBody) {
    loadOrders();
}

async function loadOrders() {
    try {
        const ordersQuery = query(collection(db, "orders"), where("storeId", "==", window.currentStoreId));
        const snapshot = await getDocs(ordersQuery);
        ordersTableBody.innerHTML = '';

        if (snapshot.empty) {
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-white-50">لا توجد طلبات.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const order = doc.data();
            const date = order.created_at ? new Date(order.created_at.seconds * 1000).toLocaleDateString() : 'N/A';
            const productNames = order.products.map(p => `${p.name} (x${p.qty})`).join(', ');

            let statusBadge = 'bg-warning text-dark';
            if (order.status === 'completed') statusBadge = 'bg-success';
            if (order.status === 'cancelled') statusBadge = 'bg-danger';

            ordersTableBody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>
                    <div class="d-flex flex-column">
                        <span class="fw-bold">${order.user_email?.split('@')[0]}</span>
                        <small class="text-white-50">${order.phone}</small>
                    </div>
                </td>
                <td>${order.address}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productNames}">
                    ${productNames}
                </td>
                <td class="fw-bold text-success">${order.total_price} EGP</td>
                <td><span class="badge ${statusBadge}">${order.status}</span></td>
                <td>
                    <div class="btn-group">
                        <button onclick="showOrderDetails('${doc.id}')" class="btn btn-sm btn-outline-info" title="التفاصيل"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="updateOrderStatus('${doc.id}', 'completed')" class="btn btn-sm btn-outline-success" title="تم التسليم"><i class="fa-solid fa-check"></i></button>
                        <button onclick="updateOrderStatus('${doc.id}', 'cancelled')" class="btn btn-sm btn-outline-danger" title="إلغاء"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    } catch (error) {
        console.error(error);
        ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">فشل تحميل الطلبات</td></tr>';
    }
}

window.updateOrderStatus = async (id, status) => {
    try {
        await updateDoc(doc(db, "orders", id), { status: status });
        Toastify({ text: "تم تحديث الحالة", style: { background: "blue" } }).showToast();
        loadOrders();
    } catch (error) {
        console.error(error);
    }
};

function generateSmartInsights(productsSnapshot, ordersSnapshot) {
    const insightsContainer = document.getElementById('smartInsights');
    if (!insightsContainer) return;

    let insightsHTML = '';

    // 1. Low Stock Alert
    let lowStockCount = 0;
    productsSnapshot.forEach(doc => {
        const p = doc.data();
        if ((p.stock || 0) <= (p.min_stock || 5)) lowStockCount++;
    });

    if (lowStockCount > 0) {
        insightsHTML += `
        <div class="alert alert-warning border-0 bg-warning bg-opacity-10 d-flex align-items-center mb-3">
            <i class="fa-solid fa-triangle-exclamation me-3 fa-xl"></i>
            <div>
                <h6 class="alert-heading fw-bold mb-1">تنبيه المخزون</h6>
                <p class="mb-0 small">يوجد ${lowStockCount} منتجات قاربت على النفاد. يفضل إعادة الطلب قريباً.</p>
            </div>
        </div>`;
    }

    // 2. Sales Trend Insight
    if (ordersSnapshot.size > 0) {
        insightsHTML += `
        <div class="alert alert-info border-0 bg-info bg-opacity-10 d-flex align-items-center mb-3">
            <i class="fa-solid fa-chart-line me-3 fa-xl"></i>
            <div>
                <h6 class="alert-heading fw-bold mb-1">اتجاه المبيعات</h6>
                <p class="mb-0 small">لقد استقبلت ${ordersSnapshot.size} طلبات هذا الشهر. أداء مستقر!</p>
            </div>
        </div>`;
    }

    // 3. Peak Time Insight (Simulated logic)
    insightsHTML += `
    <div class="alert alert-success border-0 bg-success bg-opacity-10 d-flex align-items-center">
        <i class="fa-solid fa-clock me-3 fa-xl"></i>
        <div>
            <h6 class="alert-heading fw-bold mb-1">أفضل وقت للبيع</h6>
            <p class="mb-0 small">العملاء أكثر نشاطاً بين الساعة 8 مساءً و 10 مساءً. جرب نشر عروضك في هذا الوقت.</p>
        </div>
    </div>`;

    insightsContainer.innerHTML = insightsHTML;
}

function applyUIDensity() {
    const isCompact = localStorage.getItem('uiDensity') === 'compact';
    document.body.classList.toggle('compact-mode', isCompact);
}

window.toggleUIDensity = () => {
    const isCompact = document.body.classList.toggle('compact-mode');
    localStorage.setItem('uiDensity', isCompact ? 'compact' : 'comfort');
    Toastify({ text: isCompact ? "تم تفعيل الوضع المضغوط" : "تم تفعيل الوضع المريح", style: { background: "blue" } }).showToast();
};

async function updateGoalTracking(currentSales) {
    try {
        const storeId = window.currentStoreId || 'default';
        const docSnap = await getDoc(doc(db, "settings", `${storeId}_goals`));
        const target = docSnap.exists() ? (docSnap.data().revenueGoal || 0) : 0;

        const prog = target > 0 ? Math.min((currentSales / target) * 100, 100) : 0;

        const bar = document.getElementById('goalProgressBar');
        if (bar) bar.style.width = `${prog}%`;

        const curD = document.getElementById('currentSalesDisplay');
        if (curD) curD.innerText = currentSales.toLocaleString();

        const tarD = document.getElementById('targetSalesDisplay');
        if (tarD) tarD.innerText = target.toLocaleString();
    } catch (e) {
        console.error('Goal track error:', e);
    }
}

window.setRevenueGoal = async () => {
    const { value: goal } = await Swal.fire({
        title: 'تحديد هدف المبيعات',
        input: 'number',
        inputLabel: 'أدخل المبلغ المستهدف لهذا الشهر (EGP)',
        showCancelButton: true,
        background: '#1a202e', color: '#fff'
    });

    if (goal) {
        const storeId = window.currentStoreId || 'default';
        await setDoc(doc(db, "settings", `${storeId}_goals`), {
            revenueGoal: parseFloat(goal),
            updated_at: serverTimestamp()
        });
        Toastify({ text: "تم تحديث الهدف!", style: { background: "blue" } }).showToast();
        location.reload();
    }
};

window.showOrderDetails = async (id) => {
    try {
        const orderSnap = await getDoc(doc(db, "orders", id));
        if (!orderSnap.exists()) return;
        const order = orderSnap.data();

        // Show Detail Modal (using SweetAlert2 for speed and clean look)
        const { value: comment } = await Swal.fire({
            title: `تفاصيل الطلب #${id.slice(-5)}`,
            html: `
                <div class="text-start text-white p-3">
                    <p><strong>العميل:</strong> ${order.user_email}</p>
                    <p><strong>الهاتف:</strong> ${order.phone}</p>
                    <p><strong>العنوان:</strong> ${order.address}</p>
                    <hr class="border-secondary">
                    <div class="mb-3">
                        <label class="form-label fw-bold">المنتجات:</label>
                        <ul class="list-group list-group-flush bg-transparent">
                            ${order.products.map(p => `<li class="list-group-item bg-transparent text-white border-0 py-1">- ${p.name} (x${p.qty}) - ${p.price} EGP</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-darker p-3 rounded-3 mb-3">
                        <label class="form-label fw-bold">ملاحظات العمليات:</label>
                        <div id="orderComments" class="small text-white-50 mb-2">
                            ${(order.comments || []).map(c => `<div class="mb-1 border-bottom border-secondary pb-1"><strong>${c.user}:</strong> ${c.text}</div>`).join('') || 'لا توجد ملاحظات'}
                        </div>
                    </div>
                </div>
            `,
            input: 'text',
            inputPlaceholder: 'أضف ملاحظة للموظفين...',
            confirmButtonText: 'إرسال ملاحظة',
            showCancelButton: true,
            cancelButtonText: 'إغلاق',
            background: '#1a202e',
            color: '#fff'
        });

        if (comment) {
            const comments = order.comments || [];
            comments.push({
                user: window.currentUserData?.email.split('@')[0] || 'Admin',
                text: comment,
                date: new Date().toISOString()
            });
            await updateDoc(doc(db, "orders", id), { comments: comments });
            await logActivity('إضافة ملاحظة على طلب', { orderId: id });
            showOrderDetails(id); // Reload modal
        }
    } catch (e) { console.error(e); }
};
