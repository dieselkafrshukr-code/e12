# قواعد الأمان لـ Firebase Firestore

## نسخ هذه القواعد في Firebase Console
اذهب إلى: Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // السماح فقط للمستخدمين المسجلين بالوصول
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // قواعد محددة للمنتجات
    match /products/{productId} {
      // القراءة متاحة للجميع (للموقع)
      allow read: if true;
      // الكتابة فقط للمستخدمين المسجلين (المدراء)
      allow write: if request.auth != null;
    }
    
    // قواعد محددة للطلبات
    match /orders/{orderId} {
      // القراءة والكتابة فقط للمستخدمين المسجلين
      allow read, write: if request.auth != null;
    }
    
    // قواعد محددة للمستخدمين
    match /users/{userId} {
      // القراءة والكتابة فقط للمستخدمين المسجلين
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## قواعد الأمان لـ Firebase Storage

اذهب إلى: Firebase Console → Storage → Rules

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // قواعد لصور المنتجات
    match /products/{imageId} {
      // القراءة متاحة للجميع
      allow read: if true;
      
      // الكتابة فقط للمستخدمين المسجلين
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024  // أقصى حجم 5 ميجا
                   && request.resource.contentType.matches('image/.*'); // فقط الصور
      
      // الحذف فقط للمستخدمين المسجلين
      allow delete: if request.auth != null;
    }
    
    // منع الوصول لأي مجلدات أخرى
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ملاحظات مهمة:

### للأمان الأقصى:
1. **تفعيل المصادقة فقط للإيميلات المصرح بها**
2. **تحديد حجم الصور** (5 ميجا كحد أقصى)
3. **السماح بصيغ الصور فقط** (PNG, JPG, WebP, etc.)
4. **عدم السماح بالوصول العام للطلبات**

### للموقع العام (Website):
إذا كان لديك موقع عام يعرض المنتجات:
- المنتجات: قراءة متاحة للجميع ✅
- الطلبات: فقط المستخدمين المسجلين ✅
- صور المنتجات: قراءة متاحة للجميع ✅

---

## كيفية تطبيق القواعد:

### 1. Firestore Rules
1. اذهب إلى Firebase Console
2. اختر مشروعك
3. Firestore Database → Rules
4. انسخ القواعد أعلاه
5. اضغط "Publish"

### 2. Storage Rules
1. اذهب إلى Firebase Console
2. اختر مشروعك
3. Storage → Rules
4. انسخ القواعد أعلاه
5. اضغط "Publish"

---

## اختبار القواعد:
بعد تطبيق القواعد، جرّب:
- ✅ تسجيل الدخول وإضافة منتج
- ✅ رفع صورة
- ✅ حذف منتج
- ❌ محاولة الوصول بدون تسجيل دخول (يجب أن تفشل للطلبات)

---

**ملاحظة:** هذه القواعد توازن بين الأمان وسهولة الاستخدام. يمكنك تخصيصها حسب احتياجاتك.
