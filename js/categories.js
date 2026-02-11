import { auth, collection, query, where, orderBy, limit, signOut, onAuthStateChanged } from './firebase-config.js';
import { supabase } from './supabase-config.js';
import { logActivity } from './activity-logger.js';

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
        const grid = document.getElementById('categoriesGrid');
        if (!supabase) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-warning">يرجى إضافة بيانات Supabase (URL & Key) في ملف js/supabase-config.js لتعمل الفئات.</div>';
            return;
        }

        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        if (!categories || categories.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-white-50">لا توجد فئات. أضف فئة جديدة!</div>';
            return;
        }

        const parentSelect = document.getElementById('parentCategory');
        if (parentSelect) parentSelect.innerHTML = '<option value="">بدون فئة أم (فئة رئيسية)</option>';

        categories.forEach(cat => {
            if (parentSelect && !cat.parent_id) {
                parentSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            }
        });

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
        };

        if (editingCategoryId) {
            const { error } = await supabase
                .from('categories')
                .update(data)
                .eq('id', editingCategoryId);

            if (error) throw error;
            await logActivity('تعديل قسم في Supabase', { name: data.name, id: editingCategoryId });
            Toastify({ text: "تم تحديث الفئة في Supabase بنجاح!", style: { background: "green" } }).showToast();
        } else {
            const { error } = await supabase
                .from('categories')
                .insert([data]);

            if (error) throw error;
            await logActivity('إضافة قسم لـ Supabase', { name: data.name });
            Toastify({ text: "تم إضافة الفئة لـ Supabase بنجاح!", style: { background: "green" } }).showToast();
        }

        const modalEl = document.getElementById('addCategoryModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
        e.target.reset();
        editingCategoryId = null;
        loadCategories();

    } catch (error) {
        console.error(error);
        alert('فشل حفظ الفئة في Supabase');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'حفظ الفئة';
    }
});

window.editCategory = async (id) => {
    try {
        editingCategoryId = id;
        const { data: cat, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('categoryName').value = cat.name;
        document.getElementById('parentCategory').value = cat.parent_id || '';
        document.getElementById('categoryIcon').value = cat.icon || '';
        document.getElementById('categoryOrder').value = cat.display_order || 1;
        document.getElementById('categoryActive').checked = cat.is_active !== false;

        document.querySelector('#addCategoryModal .modal-title').textContent = 'تعديل الفئة';
        new bootstrap.Modal(document.getElementById('addCategoryModal')).show();
    } catch (error) {
        console.error(error);
        alert('فشل تحميل الفئة من Supabase');
    }
};

window.deleteCategory = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await logActivity('حذف قسم من Supabase', { id: id });
        Toastify({ text: "تم حذف الفئة من Supabase", style: { background: "orange" } }).showToast();
        loadCategories();
    } catch (error) {
        console.error(error);
        alert('فشل حذف الفئة من Supabase');
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
