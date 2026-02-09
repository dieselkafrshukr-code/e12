import { auth, db, storage, collection, getDocs, doc, getDoc, signOut, onAuthStateChanged, addDoc, serverTimestamp, deleteDoc, updateDoc, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

// --- AUTH UI CHECK ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    } else {
        console.log('Logged in as:', user.email);
        // Change displayed email
        const adminEmail = document.querySelector('.user-profile small');
        if (adminEmail) adminEmail.innerText = user.email;

        // Load dashboard stats if on dashboard page
        if (window.location.pathname.endsWith('dashboard.html')) {
            loadDashboardStats();
        }
    }
});

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// --- DASHBOARD STATISTICS ---
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats...');
        // Get Products Count
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsCount = productsSnapshot.size;

        const prodEl = document.getElementById('totalProducts');
        if (prodEl) prodEl.innerText = productsCount;

        // Get Orders Count and Total Sales
        const ordersSnapshot = await getDocs(collection(db, "orders"));
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
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> جاري الرفع والحفظ...';
        btn.disabled = true;

        try {
            const name = document.getElementById('productName').value;
            const price = parseFloat(document.getElementById('productPrice').value);
            const desc = document.getElementById('productDesc').value;
            const fileInput = document.getElementById('productImageFile');
            const file = fileInput.files[0];

            let imageUrl = '';
            if (file) {
                // 1. Upload to Storage
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(uploadResult.ref);
            }

            // 2. Save to Firestore
            await addDoc(collection(db, "products"), {
                name: name,
                price: price,
                image: imageUrl,
                description: desc,
                created_at: serverTimestamp()
            });

            // Close Modal
            const modalEl = document.getElementById('addProductModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            // Reset Form and Reload
            productForm.reset();
            Toastify({ text: "تم إضافة المنتج بنجاح!", style: { background: "green" } }).showToast();
            loadProducts();

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'خطأ!',
                text: 'فشل في إضافة المنتج: ' + error.message,
                icon: 'error',
                background: '#1a202e',
                color: '#fff'
            });
        } finally {
            btn.innerHTML = originalText;
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
        const snapshot = await getDocs(collection(db, "products"));
        grid.innerHTML = '';

        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12 text-center text-white-50">لا توجد منتجات حالياً.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            grid.innerHTML += `
            <div class="col-md-3 col-sm-6">
                <div class="product-admin-card h-100 position-relative">
                    <img src="${p.image || 'https://via.placeholder.com/300?text=No+Image'}" class="product-admin-img">
                    <div class="p-3">
                        <h6 class="fw-bold text-white mb-1">${p.name}</h6>
                        <div class="text-warning fw-bold mb-3">${p.price} EGP</div>
                        <button onclick="deleteProduct('${doc.id}')" class="btn btn-sm btn-danger w-100">
                            <i class="fa-solid fa-trash me-1"></i> حذف
                        </button>
                    </div>
                </div>
            </div>`;
        });
    } catch (error) {
        console.error(error);
    }
}

window.deleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        await deleteDoc(doc(db, "products", id));
        Toastify({ text: "تم الحذف بنجاح", style: { background: "orange" } }).showToast();
        loadProducts();
    } catch (error) {
        console.error(error);
        alert('فشل الحذف');
    }
};

// --- ORDERS LOGIC ---
const ordersTableBody = document.getElementById('ordersTableBody');
if (ordersTableBody) {
    loadOrders();
}

async function loadOrders() {
    try {
        const snapshot = await getDocs(collection(db, "orders"));
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
