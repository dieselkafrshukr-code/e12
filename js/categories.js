import { auth, db, collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, updateDoc, doc, getDoc, serverTimestamp, onAuthStateChanged, signOut } from './firebase-config.js';
import { logActivity } from './main.js';

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'index.html';
    else loadCategories();
});

window.logout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

let editingCategoryId = null;

async function loadCategories() {
    try {
        const q = query(collection(db, "categories"), where("storeId", "==", window.currentStoreId));
        const snapshot = await getDocs(q);
        const grid = document.getElementById('categoriesGrid');

        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-white-50">لا توجد فئات. أضف فئة جديدة!</div>';
            return;
        }

        const categories = [];
        const parentSelect = document.getElementById('parentCategory');
        if (parentSelect) parentSelect.innerHTML = '<option value="">بدون فئة أم (فئة رئيسية)</option>';

        snapshot.forEach(doc => {
            const cat = { id: doc.id, ...doc.data() };
            categories.push(cat);
            if (parentSelect && !cat.parent_id) {
                parentSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            }
        });

        // Sort by display_order
        categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        grid.innerHTML = categories.map(cat => {
            const parentName = cat.parent_id ? (categories.find(c => c.id === cat.parent_id)?.name || '') : '';
            return `
            <div class="col-md-3 col-sm-6">
                <div class="glass-card h-100 p-4 text-center">
                    <div class="mb-3">
                        <i class="${cat.icon || 'fa-solid fa-box'} fa-3x text-primary"></i>
                    </div>
                    <h5 class="fw-bold text-white mb-1">${cat.name}</h5>
                    ${parentName ? `<small class="text-info d-block mb-2">تابع لـ: ${parentName}</small>` : ''}
                    <p class="text-white-50 mb-3">${cat.products_count || 0} منتج</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <button onclick="editCategory('${cat.id}')" class="btn btn-sm btn-outline-primary">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="deleteCategory('${cat.id}')" class="btn btn-sm btn-outline-danger">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    ${!cat.is_active ? '<span class="badge bg-secondary mt-2">غير نشط</span>' : ''}
                </div>
            </div>
        `}).join('');

    } catch (error) {
        console.error(error);
        document.getElementById('categoriesGrid').innerHTML = '<div class="col-12 text-center text-danger">فشل تحميل الفئات</div>';
    }
}

document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري الحفظ...';

    try {
        const data = {
            name: document.getElementById('categoryName').value,
            parent_id: document.getElementById('parentCategory').value || null,
            icon: document.getElementById('categoryIcon').value,
            display_order: parseInt(document.getElementById('categoryOrder').value),
            is_active: document.getElementById('categoryActive').checked,
            storeId: window.currentStoreId,
            updated_at: serverTimestamp()
        };

        if (editingCategoryId) {
            await saveVersionSnapshot('categories', editingCategoryId);
            await updateDoc(doc(db, "categories", editingCategoryId), data);
            await logActivity('تعديل قسم', { name: data.name, id: editingCategoryId });
            Toastify({ text: "تم تحديث الفئة بنجاح!", style: { background: "green" } }).showToast();
        } else {
            data.created_at = serverTimestamp();
            const newDoc = await addDoc(collection(db, "categories"), data);
            await logActivity('إضافة قسم', { name: data.name, id: newDoc.id });
            Toastify({ text: "تم إضافة الفئة بنجاح!", style: { background: "green" } }).showToast();
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        modal.hide();
        e.target.reset();
        editingCategoryId = null;
        loadCategories();

    } catch (error) {
        console.error(error);
        alert('فشل حفظ الفئة');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'حفظ الفئة';
    }
});

window.editCategory = async (id) => {
    try {
        editingCategoryId = id;
        const docSnap = await getDoc(doc(db, "categories", id));
        const cat = docSnap.data();

        document.getElementById('categoryName').value = cat.name;
        document.getElementById('parentCategory').value = cat.parent_id || '';
        document.getElementById('categoryIcon').value = cat.icon || '';
        document.getElementById('categoryOrder').value = cat.display_order || 1;
        document.getElementById('categoryActive').checked = cat.is_active !== false;

        document.querySelector('#addCategoryModal .modal-title').textContent = 'تعديل الفئة';
        new bootstrap.Modal(document.getElementById('addCategoryModal')).show();
    } catch (error) {
        console.error(error);
        alert('فشل تحميل الفئة');
    }
};

window.deleteCategory = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
        await deleteDoc(doc(db, "categories", id));
        await logActivity('حذف قسم', { id: id });
        Toastify({ text: "تم حذف الفئة", style: { background: "orange" } }).showToast();
        loadCategories();
    } catch (error) {
        console.error(error);
        alert('فشل حذف الفئة');
    }
};

document.getElementById('addCategoryModal')?.addEventListener('hidden.bs.modal', () => {
    document.getElementById('categoryForm').reset();
    editingCategoryId = null;
    document.querySelector('#addCategoryModal .modal-title').textContent = 'إضافة فئة جديدة';
});

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
                userId: auth.currentUser?.uid
            });
        }
    } catch (error) {
        console.error('Error saving version snapshot:', error);
    }
}
