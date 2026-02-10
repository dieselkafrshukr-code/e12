# 📡 توثيق API الداش بورد

## نظرة عامة
هذا الداش بورد يستخدم Firebase SDK للتعامل مع البيانات. هذا التوثيق يشرح كيفية التفاعل مع البيانات.

---

## 🔐 المصادقة (Authentication)

### تسجيل الدخول
```javascript
import { auth, signInWithEmailAndPassword } from './firebase-config.js';

await signInWithEmailAndPassword(auth, email, password);
```

### إنشاء مستخدم جديد
```javascript
import { createUserWithEmailAndPassword } from "firebase/auth";

await createUserWithEmailAndPassword(auth, email, password);
```

### تسجيل الخروج
```javascript
import { signOut } from './firebase-config.js';

await signOut(auth);
```

### التحقق من حالة المستخدم
```javascript
import { onAuthStateChanged } from './firebase-config.js';

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('تم تسجيل الدخول:', user.email);
    } else {
        console.log('لم يتم تسجيل الدخول');
    }
});
```

---

## 📦 المنتجات (Products)

### بنية البيانات
```javascript
{
    name: "اسم المنتج",
    price: 50,                    // رقم
    image: "https://...",         // URL من Firebase Storage
    description: "وصف المنتج",
    created_at: Timestamp        // serverTimestamp()
}
```

### إضافة منتج
```javascript
import { db, collection, addDoc, serverTimestamp } from './firebase-config.js';

await addDoc(collection(db, "products"), {
    name: "شيبسي",
    price: 50,
    image: imageUrl,
    description: "شيبسي لذيذ",
    created_at: serverTimestamp()
});
```

### جلب جميع المنتجات
```javascript
import { db, collection, getDocs } from './firebase-config.js';

const snapshot = await getDocs(collection(db, "products"));
snapshot.forEach(doc => {
    const product = doc.data();
    console.log(doc.id, product);
});
```

### جلب منتج واحد
```javascript
import { db, doc, getDoc } from './firebase-config.js';

const docRef = doc(db, "products", productId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
    const product = docSnap.data();
    console.log(product);
}
```

### حذف منتج
```javascript
import { db, doc, deleteDoc } from './firebase-config.js';

await deleteDoc(doc(db, "products", productId));
```

### تعديل منتج
```javascript
import { db, doc, updateDoc } from './firebase-config.js';

await updateDoc(doc(db, "products", productId), {
    name: "اسم جديد",
    price: 75
});
```

---

## 📤 رفع الصور (Storage)

### رفع صورة
```javascript
import { storage, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

// 1. إنشاء مرجع للصورة
const timestamp = Date.now();
const imageName = `products/${timestamp}_${file.name}`;
const storageRef = ref(storage, imageName);

// 2. رفع الصورة
await uploadBytes(storageRef, file);

// 3. الحصول على رابط التحميل
const imageUrl = await getDownloadURL(storageRef);
```

### حذف صورة (يدوياً من Firebase Console)
الصور حالياً لا يتم حذفها تلقائياً عند حذف المنتج. يمكنك:
1. الذهاب إلى Firebase Console → Storage
2. حذف الصور يدوياً من مجلد `products/`

---

## 🛒 الطلبات (Orders)

### بنية البيانات
```javascript
{
    user_email: "customer@example.com",
    phone: "01234567890",
    address: "عنوان العميل",
    products: [
        {
            name: "شيبسي",
            price: 50,
            qty: 2
        }
    ],
    total_price: 100,
    status: "pending",           // pending, completed, cancelled
    created_at: Timestamp
}
```

### جلب جميع الطلبات
```javascript
const snapshot = await getDocs(collection(db, "orders"));
snapshot.forEach(doc => {
    const order = doc.data();
    console.log(doc.id, order);
});
```

### تحديث حالة الطلب
```javascript
await updateDoc(doc(db, "orders", orderId), {
    status: "completed"  // أو "cancelled"
});
```

---

## 📊 الإحصائيات (Statistics)

### حساب عدد المنتجات
```javascript
const productsSnapshot = await getDocs(collection(db, "products"));
const productsCount = productsSnapshot.size;
```

### حساب إجمالي المبيعات
```javascript
const ordersSnapshot = await getDocs(collection(db, "orders"));
let totalSales = 0;

ordersSnapshot.forEach(doc => {
    const order = doc.data();
    if (order.status === 'completed') {
        totalSales += order.total_price || 0;
    }
});
```

### عد الطلبات الجديدة
```javascript
let newOrdersCount = 0;

ordersSnapshot.forEach(doc => {
    const order = doc.data();
    if (order.status === 'pending') {
        newOrdersCount++;
    }
});
```

---

## 🗑️ حذف جميع البيانات

### حذف كل المنتجات
```javascript
const productsSnapshot = await getDocs(collection(db, "products"));
for (const docSnapshot of productsSnapshot.docs) {
    await deleteDoc(doc(db, "products", docSnapshot.id));
}
```

### حذف كل الطلبات
```javascript
const ordersSnapshot = await getDocs(collection(db, "orders"));
for (const docSnapshot of ordersSnapshot.docs) {
    await deleteDoc(doc(db, "orders", docSnapshot.id));
}
```

---

## 🔍 أمثلة متقدمة

### البحث عن منتج بالاسم
```javascript
const snapshot = await getDocs(collection(db, "products"));
const filteredProducts = [];

snapshot.forEach(doc => {
    const product = doc.data();
    if (product.name.includes("شيبسي")) {
        filteredProducts.push({ id: doc.id, ...product });
    }
});
```

### ترتيب المنتجات حسب السعر
```javascript
const snapshot = await getDocs(collection(db, "products"));
const products = [];

snapshot.forEach(doc => {
    products.push({ id: doc.id, ...doc.data() });
});

// ترتيب تصاعدي
products.sort((a, b) => a.price - b.price);

// ترتيب تنازلي
products.sort((a, b) => b.price - a.price);
```

### تحليل أداء المبيعات
```javascript
const ordersSnapshot = await getDocs(collection(db, "orders"));
const stats = {
    total: ordersSnapshot.size,
    pending: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0
};

ordersSnapshot.forEach(doc => {
    const order = doc.data();
    stats[order.status]++;
    if (order.status === 'completed') {
        stats.revenue += order.total_price;
    }
});

console.log(stats);
```

---

## ⚠️ معالجة الأخطاء

### معالجة أخطاء المصادقة
```javascript
try {
    await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
    if (error.code === 'auth/invalid-email') {
        console.log('البريد الإلكتروني غير صالح');
    } else if (error.code === 'auth/wrong-password') {
        console.log('كلمة المرور غير صحيحة');
    } else if (error.code === 'auth/user-not-found') {
        console.log('المستخدم غير موجود');
    } else {
        console.log('خطأ:', error.message);
    }
}
```

### معالجة أخطاء Firestore
```javascript
try {
    await addDoc(collection(db, "products"), productData);
} catch (error) {
    if (error.code === 'permission-denied') {
        console.log('ليس لديك صلاحية لتنفيذ هذا الإجراء');
    } else {
        console.log('خطأ:', error.message);
    }
}
```

---

## 🎯 أفضل الممارسات

### 1. استخدم معاينة الصور قبل الرفع
```javascript
const file = e.target.files[0];
const reader = new FileReader();
reader.onload = (e) => {
    previewImg.src = e.target.result;
};
reader.readAsDataURL(file);
```

### 2. تحديد حجم الصور
```javascript
const maxSize = 5 * 1024 * 1024; // 5 ميجا
if (file.size > maxSize) {
    alert('الصورة كبيرة جداً! الحد الأقصى 5 ميجا');
    return;
}
```

### 3. التحقق من صيغة الصورة
```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
    alert('صيغة الصورة غير مدعومة!');
    return;
}
```

### 4. استخدام Loading States
```javascript
const btn = document.querySelector('button');
btn.innerHTML = '<i class="fa-spinner fa-spin"></i> جاري التحميل...';
btn.disabled = true;

// بعد الانتهاء
btn.innerHTML = 'حفظ';
btn.disabled = false;
```

---

## 📚 مصادر إضافية

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)

---

**تم التوثيق بواسطة Gemini AI**
