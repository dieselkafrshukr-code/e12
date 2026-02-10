import { auth, db, collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, onAuthStateChanged, signOut } from './firebase-config.js';

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
        const snapshot = await getDocs(collection(db, "categories"));
        const grid = document.getElementById('categoriesGrid');

        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-white-50">لا توجد فئات. أضف فئة جديدة!</div>';
            return;
        }

        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });

        // Sort by display_order
        categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        grid.innerHTML = categories.map(cat => `
            <div class="col-md-3 col-sm-6">
                <div class="glass-card h-100 p-4 text-center">
                    <div class="mb-3">
                        <i class="${cat.icon || 'fa-solid fa-box'} fa-3x text-primary"></i>
                    </div>
                    <h5 class="fw-bold text-white mb-2">${cat.name}</h5>
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
        `).join('');

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
            icon: document.getElementById('categoryIcon').value,
            display_order: parseInt(document.getElementById('categoryOrder').value),
            is_active: document.getElementById('categoryActive').checked,
            products_count: 0,
            updated_at: serverTimestamp()
        };

        if (editingCategoryId) {
            await updateDoc(doc(db, "categories", editingCategoryId), data);
            Toastify({ text: "تم تحديث الفئة بنجاح!", style: { background: "green" } }).showToast();
        } else {
            data.created_at = serverTimestamp();
            await addDoc(collection(db, "categories"), data);
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
