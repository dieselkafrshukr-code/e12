import { auth, db, storage, collection, query, where, getDocs, doc, getDoc, signOut, onAuthStateChanged, addDoc, serverTimestamp, deleteDoc, updateDoc, ref, uploadBytes, getDownloadURL } from './firebase-config.js';
import { logActivity } from './main.js';

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        loadProducts();
        loadCategories();
    }
});

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// Global variables
let allProducts = [];
let categories = [];
let editingProductId = null;

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
    try {
        const q = query(collection(db, "categories"), where("storeId", "==", window.currentStoreId));
        const snapshot = await getDocs(q);
        categories = [];

        const categoryFilter = document.getElementById('categoryFilter');
        const productCategory = document.getElementById('productCategory');

        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        productCategory.innerHTML = '<option value="">اختر الفئة</option>';

        const cats = [];
        snapshot.forEach(doc => {
            cats.push({ id: doc.id, ...doc.data() });
        });

        cats.forEach(cat => {
            const parent = cat.parent_id ? cats.find(c => c.id === cat.parent_id) : null;
            const displayName = parent ? `${parent.name} > ${cat.name}` : cat.name;

            categories.push({ ...cat, displayName });

            categoryFilter.innerHTML += `<option value="${cat.name}">${displayName}</option>`;
            productCategory.innerHTML += `<option value="${cat.name}">${displayName}</option>`;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        const q = query(collection(db, "products"), where("storeId", "==", window.currentStoreId));
        const snapshot = await getDocs(q);
        allProducts = [];

        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        displayProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('productsGrid');
        if (grid) grid.innerHTML = '<tr><td colspan="10" class="text-center text-danger">فشل تحميل المنتجات</td></tr>';
    }
}

// ==================== DISPLAY PRODUCTS ====================
function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-white-50">لا توجد منتجات</td></tr>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const stock = p.stock || 0;
        const minStock = p.min_stock || 5;
        const totalSold = p.total_sold || 0;
        const isActive = p.is_active !== false;
        const discount = p.discount || 0;

        // Stock status
        let stockBadge = '';
        if (stock === 0) {
            stockBadge = '<span class="badge bg-danger">نفذ</span>';
        } else if (stock <= minStock) {
            stockBadge = `<span class="badge bg-warning text-dark">${stock}</span>`;
        } else {
            stockBadge = `<span class="badge bg-success">${stock}</span>`;
        }

        // Price display
        let priceDisplay = `<span ondblclick="makeEditable(this, '${p.id}', 'price')" class="editable-field">${p.price} ج.م</span>`;
        if (discount > 0) {
            const discountedPrice = p.price - (p.price * discount / 100);
            priceDisplay = `
                <div>
                    <span class="text-decoration-line-through text-muted">${p.price}</span>
                    <span class="text-success fw-bold">${discountedPrice.toFixed(2)} ج.م</span>
                    <span class="badge bg-danger ms-1">${discount}%</span>
                </div>
            `;
        }

        // Status badge
        const statusBadge = isActive
            ? '<span class="badge bg-success">متاح</span>'
            : '<span class="badge bg-secondary">غير متاح</span>';

        // Profit Calculation
        const finalPrice = discount > 0 ? (p.price - (p.price * discount / 100)) : p.price;
        const profit = finalPrice - (p.cost_price || 0);

        return `
        <tr data-id="${p.id}">
            <td class="ps-4 text-center">
                <input type="checkbox" class="form-check-input product-select" data-id="${p.id}">
            </td>
            <td class="ps-2">
                <img src="${mainImage}" width="50" height="50" style="object-fit: cover; border-radius: 8px;">
            </td>
            <td>
                <div class="fw-bold">${p.name}</div>
                ${p.is_featured ? '<span class="badge bg-warning text-dark"><i class="fa-solid fa-star"></i> مميز</span>' : ''}
            </td>
            <td>${p.category || 'بدون فئة'}</td>
            <td>${priceDisplay}</td>
            <td>${stockBadge}</td>
            <td>${totalSold}</td>
            <td class="fw-bold ${profit > 0 ? 'text-success' : 'text-danger'}">${profit.toFixed(2)} ج.م</td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group">
                    <button onclick="editProduct('${p.id}')" class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="showVersionHistory('${p.id}')" class="btn btn-sm btn-outline-info" title="تاريخ التعديلات"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button onclick="duplicateProduct('${p.id}')" class="btn btn-sm btn-outline-success"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Attach Bulk Listeners
    initBulkActions();
}

function initBulkActions() {
    const selectAll = document.getElementById('selectAllProducts');
    const checkboxes = document.querySelectorAll('.product-select');
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');

    if (selectAll) {
        selectAll.onclick = (e) => {
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateBar();
        };
    }

    checkboxes.forEach(cb => cb.onchange = updateBar);

    function updateBar() {
        const selected = document.querySelectorAll('.product-select:checked');
        if (selected.length > 0) {
            bar.style.display = 'block';
            count.innerText = selected.length;
        } else {
            bar.style.display = 'none';
        }
    }
}

window.hideBulkBar = () => {
    document.getElementById('bulkActionsBar').style.display = 'none';
    document.getElementById('selectAllProducts').checked = false;
    document.querySelectorAll('.product-select').forEach(cb => cb.checked = false);
};

window.bulkDelete = async () => {
    const selected = Array.from(document.querySelectorAll('.product-select:checked')).map(cb => cb.dataset.id);
    if (selected.length === 0) return;

    const result = await Swal.fire({
        title: 'حذف الجملة',
        text: `هل أنت متأكد من حذف ${selected.length} منتجات؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف الكل',
        background: '#1a202e', color: '#fff'
    });

    if (result.isConfirmed) {
        for (const id of selected) {
            await deleteDoc(doc(db, "products", id));
        }
        await logActivity('حذف بالجملة', { count: selected.length });
        Toastify({ text: "تم الحذف بنجاح", style: { background: "orange" } }).showToast();
        loadProducts();
        hideBulkBar();
    }
};

window.bulkUpdateStatus = async (status) => {
    const selected = Array.from(document.querySelectorAll('.product-select:checked')).map(cb => cb.dataset.id);
    if (selected.length === 0) return;

    for (const id of selected) {
        await updateDoc(doc(db, "products", id), { is_active: status, updated_at: serverTimestamp() });
    }
    Toastify({ text: "تم تحديث الحالة للجملة", style: { background: "green" } }).showToast();
    loadProducts();
    hideBulkBar();
};

// ==================== SEARCH & FILTER ====================
document.getElementById('searchInput')?.addEventListener('input', filterProducts);
document.getElementById('categoryFilter')?.addEventListener('change', filterProducts);
document.getElementById('stockFilter')?.addEventListener('change', filterProducts);
document.getElementById('minPrice')?.addEventListener('input', filterProducts);
document.getElementById('maxPrice')?.addEventListener('input', filterProducts);

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

    let filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || p.category === categoryFilter;

        const price = p.discounted_price || p.price || 0;
        const matchesPrice = price >= minPrice && price <= maxPrice;

        let matchesStock = true;
        const stock = p.stock || 0;
        const minStock = p.min_stock || 5;

        if (stockFilter === 'in_stock') matchesStock = stock > minStock;
        else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= minStock;
        else if (stockFilter === 'out_of_stock') matchesStock = stock === 0;

        return matchesSearch && matchesCategory && matchesStock && matchesPrice;
    });

    displayProducts(filtered);
}

// ==================== IMAGE PREVIEW ====================
document.getElementById('productImages')?.addEventListener('change', function (e) {
    const files = e.target.files;
    const preview = document.getElementById('imagesPreview');
    preview.innerHTML = '';

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const col = document.createElement('div');
            col.className = 'col-md-3';
            col.innerHTML = `
                <div class="position-relative">
                    <img src="${e.target.result}" class="img-fluid rounded">
                    ${index === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-2">رئيسية</span>' : ''}
                </div>
            `;
            preview.appendChild(col);
        };
        reader.readAsDataURL(file);
    });
});

// ==================== ADD/EDIT PRODUCT ====================
const productForm = document.getElementById('productForm');

async function checkDuplicateName(name) {
    const q = query(collection(db, "products"),
        where("storeId", "==", window.currentStoreId),
        where("name", "==", name)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Basic Validation
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const discount = parseFloat(document.getElementById('productDiscount').value) || 0;

    if (!name) return Toastify({ text: "الاسم مطلوب", style: { background: "red" } }).showToast();
    if (price <= 0) return Toastify({ text: "السعر يجب أن يكون أكبر من صفر", style: { background: "red" } }).showToast();

    // 2. Duplicate Detection (For New Products)
    if (!editingProductId) {
        const isDup = await checkDuplicateName(name);
        if (isDup) {
            const confirm = await Swal.fire({
                title: 'منتج مكرر!',
                text: 'يوجد منتج بنفس الاسم حالياً. هل تريد الإضافة على أي حال؟',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم، أضف',
                cancelButtonText: 'إلغاء',
                background: '#1a202e', color: '#fff'
            });
            if (!confirm.isConfirmed) return;
        }
    }

    // 3. Dry-Run / Preview
    const finalPrice = price - (price * discount / 100);
    const dryRun = await Swal.fire({
        title: 'تأكيد الحفظ',
        html: `
            <div class="text-start">
                <p><strong>اسم المنتج:</strong> ${name}</p>
                <p><strong>السعر النهائي:</strong> ${finalPrice} ج.م</p>
                <p><strong>المخزون الحالي:</strong> ${stock} قطعة</p>
                <p class="small text-white-50 mt-3">سيتم حفظ البيانات ورفع الصور المختارة.</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'تأكيد وحفظ',
        cancelButtonText: 'تعديل',
        background: '#1a202e', color: '#fff'
    });

    if (!dryRun.isConfirmed) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> <span id="saveStatus">جاري الحفظ...</span>';
    btn.disabled = true;
    const statusEl = document.getElementById('saveStatus');

    try {
        // 4. Image Upload
        const imageFiles = document.getElementById('productImages').files;
        let imageUrls = [];

        if (imageFiles.length > 0) {
            let i = 1;
            for (let file of imageFiles) {
                if (statusEl) statusEl.innerText = `جاري رفع الصورة (${i}/${imageFiles.length})...`;
                const timestamp = Date.now();
                const imageName = `products/${timestamp}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
                const storageRef = ref(storage, imageName);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
                i++;
            }
        } else if (!editingProductId) {
            throw new Error('الرجاء اختيار صورة المنتج');
        }

        // 5. Build Final Object
        const productData = {
            name,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDesc').value || '',
            price,
            discount,
            discounted_price: finalPrice,
            cost_price: parseFloat(document.getElementById('productCostPrice').value) || 0,
            discount_end_date: document.getElementById('discountEndDate').value || null,
            stock,
            min_stock: parseInt(document.getElementById('productMinStock').value) || 5,
            is_active: document.getElementById('productActive').checked,
            is_featured: document.getElementById('productFeatured').checked,
            storeId: window.currentStoreId || 'default',
            updated_at: serverTimestamp()
        };

        if (imageUrls.length > 0) {
            productData.images = imageUrls;
            productData.main_image = imageUrls[0];
            productData.image = imageUrls[0];
        }

        // 6. Database Operation
        if (editingProductId) {
            // Backup before update
            await saveVersionSnapshot('products', editingProductId);
            await updateDoc(doc(db, "products", editingProductId), productData);
            await logActivity('تعديل منتج', { name: productData.name, id: editingProductId });
            Toastify({ text: "تم تحديث المنتج بنجاح!", style: { background: "green" } }).showToast();
        } else {
            productData.created_at = serverTimestamp();
            productData.total_sold = 0;
            productData.views = 0;
            const newDoc = await addDoc(collection(db, "products"), productData);
            await logActivity('إضافة منتج', { name: productData.name, id: newDoc.id });
            Toastify({ text: "تم إضافة المنتج بنجاح!", style: { background: "green" } }).showToast();
        }

        // Close Modal safely
        const modalEl = document.getElementById('addProductModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();

        productForm.reset();
        document.getElementById('imagesPreview').innerHTML = '';
        editingProductId = null;
        loadProducts();

    } catch (error) {
        console.error(error);
        Swal.fire({ title: 'خطأ!', text: error.message, icon: 'error', background: '#1a202e', color: '#fff' });
    } finally {
        btn.innerHTML = 'حفظ المنتج';
        btn.disabled = false;
    }
});

// ==================== EDIT PRODUCT ====================
window.editProduct = async (id) => {
    try {
        editingProductId = id;
        const docSnap = await getDoc(doc(db, "products", id));

        if (!docSnap.exists()) {
            throw new Error('المنتج غير موجود');
        }

        const p = docSnap.data();

        // Fill form
        document.getElementById('productName').value = p.name || '';
        document.getElementById('productCategory').value = p.category || '';
        document.getElementById('productDesc').value = p.description || '';
        document.getElementById('productCostPrice').value = p.cost_price || 0;
        document.getElementById('productPrice').value = p.price || 0;
        document.getElementById('productDiscount').value = p.discount || 0;
        document.getElementById('discountEndDate').value = p.discount_end_date || '';
        document.getElementById('productStock').value = p.stock || 0;
        document.getElementById('productMinStock').value = p.min_stock || 5;
        document.getElementById('productActive').checked = p.is_active !== false;
        document.getElementById('productFeatured').checked = p.is_featured || false;

        // Show existing images
        if (p.images && p.images.length > 0) {
            const preview = document.getElementById('imagesPreview');
            preview.innerHTML = p.images.map((url, index) => `
                <div class="col-md-3">
                    <div class="position-relative">
                        <img src="${url}" class="img-fluid rounded">
                        ${index === 0 ? '<span class="badge bg-primary position-absolute top-0 start-0 m-2">رئيسية</span>' : ''}
                    </div>
                </div>
            `).join('');
        }

        // Change modal title
        document.querySelector('#addProductModal .modal-title').textContent = 'تعديل المنتج';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
        modal.show();

    } catch (error) {
        console.error(error);
        alert('فشل تحميل بيانات المنتج');
    }
};

// ==================== DUPLICATE PRODUCT ====================
window.duplicateProduct = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (!docSnap.exists()) return;

        const p = docSnap.data();
        const newProduct = {
            ...p,
            name: p.name + ' (نسخة)',
            created_at: serverTimestamp(),
            total_sold: 0,
            views: 0
        };

        await addDoc(collection(db, "products"), newProduct);
        Toastify({ text: "تم نسخ المنتج بنجاح!", style: { background: "blue" } }).showToast();
        loadProducts();

    } catch (error) {
        console.error(error);
        alert('فشل نسخ المنتج');
    }
};

// ==================== DELETE PRODUCT ====================
window.deleteProduct = async (id) => {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم حذف المنتج نهائياً!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف!',
        cancelButtonText: 'إلغاء',
        background: '#1a202e',
        color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "products", id));
            await logActivity('حذف منتج', { id: id });
            Toastify({ text: "تم حذف المنتج بنجاح", style: { background: "orange" } }).showToast();
            loadProducts();
        } catch (error) {
            console.error(error);
            alert('فشل حذف المنتج');
        }
    }
};

// ==================== EXPORT TO EXCEL ====================
window.exportProducts = () => {
    // Create CSV content
    let csv = 'اسم المنتج,الفئة,سعر الشراء,سعر البيع,الخصم,المخزون,المبيعات,الحالة\n';

    allProducts.forEach(p => {
        csv += `"${p.name}","${p.category || ''}",${p.cost_price || 0},${p.price},${p.discount || 0},${p.stock || 0},${p.total_sold || 0},"${p.is_active !== false ? 'متاح' : 'غير متاح'}"\n`;
    });

    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    Toastify({ text: "تم تصدير المنتجات بنجاح!", style: { background: "green" } }).showToast();
};

// ==================== VERSION HISTORY ====================
async function saveVersionSnapshot(collectionName, docId) {
    try {
        const docSnap = await getDoc(doc(db, collectionName, docId));
        if (docSnap.exists()) {
            await addDoc(collection(db, "versions"), {
                targetCollection: collectionName,
                targetId: docId,
                data: docSnap.data(),
                timestamp: serverTimestamp(),
                userId: auth.currentUser.uid
            });
        }
    } catch (error) {
        console.error('Error saving version snapshot:', error);
    }
}

window.showVersionHistory = async (id) => {
    const q = query(
        collection(db, "versions"),
        where("targetId", "==", id),
        orderBy("timestamp", "desc"),
        limit(5)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        Swal.fire({
            title: 'لا يوجد تاريخ تعديلات',
            text: 'لم يتم تعديل هذا المنتج مسبقاً بعد تفعيل ميزة التتبع.',
            icon: 'info',
            background: '#1a202e', color: '#fff'
        });
        return;
    }

    const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const { value: versionId } = await Swal.fire({
        title: 'تاريخ التعديلات',
        input: 'select',
        inputOptions: versions.reduce((acc, v) => {
            const date = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleString('ar-EG') : 'N/A';
            acc[v.id] = `نسخة: ${date}`;
            return acc;
        }, {}),
        inputPlaceholder: 'اختر النسخة للرجوع إليها',
        showCancelButton: true,
        confirmButtonText: 'استعادة هذه النسخة',
        cancelButtonText: 'إلغاء',
        background: '#1a202e', color: '#fff'
    });

    if (versionId) {
        const selectedVersion = versions.find(v => v.id === versionId);
        await updateDoc(doc(db, "products", id), selectedVersion.data);
        await logActivity('استرجاع نسخة قديمة', { id: id, versionId: versionId });
        Toastify({ text: "تمت استعادة النسخة بنجاح!", style: { background: "green" } }).showToast();
        loadProducts();
    }
};

// ==================== INLINE EDITING ====================
window.makeEditable = (el, id, field) => {
    const originalValue = el.innerText.replace(' EGP', '');
    const input = document.createElement('input');
    input.type = field === 'stock' ? 'number' : 'text';
    input.value = originalValue;
    input.className = 'form-control form-control-sm bg-dark text-white border-primary';
    input.style.width = '80px';

    el.parentNode.replaceChild(input, el);
    input.focus();

    input.onblur = async () => {
        const newValue = input.value;
        if (newValue !== originalValue) {
            try {
                const updateData = {};
                updateData[field] = field === 'stock' ? parseInt(newValue) : parseFloat(newValue);
                updateData.updated_at = serverTimestamp();

                await saveVersionSnapshot('products', id);
                await updateDoc(doc(db, "products", id), updateData);
                await logActivity('تعديل سريع (Inline)', { id: id, field: field, old: originalValue, new: newValue });

                Toastify({ text: "تم التحديث!", style: { background: "green" } }).showToast();
            } catch (e) {
                console.error(e);
                Toastify({ text: "فشل التحديث", style: { background: "red" } }).showToast();
            }
        }
        loadProducts();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.value = originalValue;
            input.blur();
        }
    };
};

// Reset form when modal closes
document.getElementById('addProductModal')?.addEventListener('hidden.bs.modal', () => {
    productForm.reset();
    editingProductId = null;
    document.getElementById('imagesPreview').innerHTML = '';
    document.querySelector('#addProductModal .modal-title').textContent = 'إضافة منتج جديد';
});
