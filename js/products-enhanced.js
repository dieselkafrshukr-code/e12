import { auth, db, storage, collection, getDocs, doc, getDoc, signOut, onAuthStateChanged, addDoc, serverTimestamp, deleteDoc, updateDoc, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

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
        const snapshot = await getDocs(collection(db, "categories"));
        categories = [];

        const categoryFilter = document.getElementById('categoryFilter');
        const productCategory = document.getElementById('productCategory');

        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        productCategory.innerHTML = '<option value="">اختر الفئة</option>';

        snapshot.forEach(doc => {
            const cat = { id: doc.id, ...doc.data() };
            categories.push(cat);

            categoryFilter.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
            productCategory.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        allProducts = [];

        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        displayProducts(allProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">فشل تحميل المنتجات</td></tr>';
    }
}

// ==================== DISPLAY PRODUCTS ====================
function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-white-50">لا توجد منتجات</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
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
        let priceDisplay = `${p.price} ج.م`;
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

        // Image
        const mainImage = p.main_image || p.image || (p.images && p.images[0]) || 'https://via.placeholder.com/50';

        return `
        <tr>
            <td class="ps-4">
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
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group">
                    <button onclick="editProduct('${p.id}')" class="btn btn-sm btn-outline-primary" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="duplicateProduct('${p.id}')" class="btn btn-sm btn-outline-info" title="نسخ">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="btn btn-sm btn-outline-danger" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ==================== SEARCH & FILTER ====================
document.getElementById('searchInput')?.addEventListener('input', filterProducts);
document.getElementById('categoryFilter')?.addEventListener('change', filterProducts);
document.getElementById('stockFilter')?.addEventListener('change', filterProducts);

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;

    let filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || p.category === categoryFilter;

        let matchesStock = true;
        const stock = p.stock || 0;
        const minStock = p.min_stock || 5;

        if (stockFilter === 'in_stock') matchesStock = stock > minStock;
        else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= minStock;
        else if (stockFilter === 'out_of_stock') matchesStock = stock === 0;

        return matchesSearch && matchesCategory && matchesStock;
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
productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<div class="spinner-border spinner-border-sm"></div> جاري الحفظ...';
    btn.disabled = true;

    try {
        // Upload images
        const imageFiles = document.getElementById('productImages').files;
        let imageUrls = [];

        if (imageFiles.length > 0) {
            for (let file of imageFiles) {
                const timestamp = Date.now();
                const imageName = `products/${timestamp}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
                const storageRef = ref(storage, imageName);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
            }
        } else if (!editingProductId) {
            throw new Error('الرجاء اختيار صورة المنتج');
        }

        // Prepare product data
        const productData = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDesc').value || '',

            cost_price: parseFloat(document.getElementById('productCostPrice').value) || 0,
            price: parseFloat(document.getElementById('productPrice').value),
            discount: parseFloat(document.getElementById('productDiscount').value) || 0,
            discount_end_date: document.getElementById('discountEndDate').value || null,

            stock: parseInt(document.getElementById('productStock').value) || 0,
            min_stock: parseInt(document.getElementById('productMinStock').value) || 5,

            is_active: document.getElementById('productActive').checked,
            is_featured: document.getElementById('productFeatured').checked,

            updated_at: serverTimestamp()
        };

        // Calculate discounted price
        productData.discounted_price = productData.price - (productData.price * productData.discount / 100);

        // Handle images
        if (imageUrls.length > 0) {
            productData.images = imageUrls;
            productData.main_image = imageUrls[0];
            productData.image = imageUrls[0]; // للتوافق مع الكود القديم
        }

        // Add or Update
        if (editingProductId) {
            await updateDoc(doc(db, "products", editingProductId), productData);
            Toastify({ text: "تم تحديث المنتج بنجاح!", style: { background: "green" } }).showToast();
        } else {
            productData.created_at = serverTimestamp();
            productData.total_sold = 0;
            productData.views = 0;
            await addDoc(collection(db, "products"), productData);
            Toastify({ text: "تم إضافة المنتج بنجاح!", style: { background: "green" } }).showToast();
        }

        // Close modal and reload
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        modal.hide();
        productForm.reset();
        document.getElementById('imagesPreview').innerHTML = '';
        editingProductId = null;
        loadProducts();

    } catch (error) {
        console.error(error);
        Swal.fire({
            title: 'خطأ!',
            text: error.message || 'فشل في حفظ المنتج',
            icon: 'error',
            background: '#1a202e',
            color: '#fff'
        });
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

// Reset form when modal closes
document.getElementById('addProductModal')?.addEventListener('hidden.bs.modal', () => {
    productForm.reset();
    editingProductId = null;
    document.getElementById('imagesPreview').innerHTML = '';
    document.querySelector('#addProductModal .modal-title').textContent = 'إضافة منتج جديد';
});
