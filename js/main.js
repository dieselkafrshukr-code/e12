import { auth, db, collection, getDocs, doc, getDoc, signOut, onAuthStateChanged, addDoc, serverTimestamp, deleteDoc, updateDoc } from './firebase-config.js';

// --- AUTH UI CHECK ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        if (!window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    } else {
        console.log('Logged in as:', user.email);
    }
});

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// --- PRODUCTS LOGIC ---
const productForm = document.getElementById('addProductForm');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> جاري الحفظ...';
        btn.disabled = true;

        try {
            await addDoc(collection(db, "products"), {
                name: document.getElementById('productName').value,
                price: parseFloat(document.getElementById('productPrice').value),
                image: document.getElementById('productImage').value,
                description: document.getElementById('productDesc').value,
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
            Toastify({ text: "فشل الإضافة: " + error.message, style: { background: "red" } }).showToast();
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
