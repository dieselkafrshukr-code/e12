# 📊 بنية البيانات الجديدة - Dashboard

## 📦 Products (المنتجات)

```javascript
{
    // معلومات أساسية
    name: "شيبسي ليز",
    description: "شيبسي بطاطس مقرمش",
    
    // الأسعار والأرباح
    price: 50,                      // سعر البيع
    cost_price: 40,                 // سعر الشراء (للأرباح)
    discount: 0,                    // نسبة الخصم (%)
    discounted_price: 50,           // السعر بعد الخصم
    discount_end_date: null,        // تاريخ انتهاء العرض
    
    // التصنيف والمخزون
    category: "شيبسي",              // الفئة
    stock: 100,                     // المخزون المتاح
    min_stock: 10,                  // حد التنبيه للمخزون
    
    // الصور
    images: [                       // صور متعددة
        "https://...",
        "https://...",
        "https://..."
    ],
    main_image: "https://...",      // الصورة الرئيسية
    
    // الحالة
    is_active: true,                // متاح للبيع
    is_featured: false,             // منتج مميز
    
    // الإحصائيات
    total_sold: 0,                  // إجمالي المبيعات
    views: 0,                       // عدد المشاهدات
    
    // التواريخ
    created_at: Timestamp,
    updated_at: Timestamp
}
```

---

## 🛒 Orders (الطلبات)

```javascript
{
    // معلومات العميل
    customer_id: "user_123",        // ID العميل
    customer_name: "أحمد محمد",
    customer_email: "customer@example.com",
    customer_phone: "01234567890",
    
    // العنوان
    address: {
        full_address: "شارع 123، القاهرة",
        city: "القاهرة",
        area: "المعادي",
        coordinates: {              // للخريطة
            lat: 30.0444,
            lng: 31.2357
        }
    },
    
    // المنتجات
    products: [
        {
            id: "product_123",
            name: "شيبسي ليز",
            price: 50,
            quantity: 2,
            subtotal: 100,
            image: "https://..."
        }
    ],
    
    // المبالغ
    subtotal: 100,                  // المجموع قبل الخصم
    discount_code: "SAVE20",        // كود الخصم
    discount_amount: 20,            // قيمة الخصم
    total_price: 80,                // المجموع النهائي
    
    // الحالة
    status: "pending",              // pending, preparing, ready, delivered, cancelled
    payment_status: "pending",      // pending, paid, refunded
    payment_method: "cash",         // cash, online
    
    // ملاحظات
    customer_notes: "أفضل التوصيل بعد المغرب",
    admin_notes: "عميل VIP",       // ملاحظات المحل
    
    // التتبع
    status_history: [               // سجل الحالات
        {
            status: "pending",
            timestamp: Timestamp,
            note: "طلب جديد"
        },
        {
            status: "preparing",
            timestamp: Timestamp,
            note: "قيد التحضير"
        }
    ],
    
    // التواريخ
    created_at: Timestamp,
    updated_at: Timestamp,
    delivered_at: null
}
```

---

## 👥 Customers (العملاء)

```javascript
{
    name: "أحمد محمد",
    email: "customer@example.com",
    phone: "01234567890",
    
    // الإحصائيات
    total_orders: 10,
    total_spent: 1000,
    is_vip: false,                  // عميل VIP
    
    // العناوين المحفوظة
    addresses: [
        {
            label: "المنزل",
            full_address: "شارع 123",
            city: "القاهرة",
            is_default: true
        }
    ],
    
    // التواريخ
    first_order_date: Timestamp,
    last_order_date: Timestamp,
    created_at: Timestamp
}
```

---

## 🎫 Coupons (كوبونات الخصم)

```javascript
{
    code: "SAVE20",                 // الكود
    type: "percentage",             // percentage أو fixed
    value: 20,                      // القيمة أو النسبة
    
    // الشروط
    min_order: 100,                 // أقل قيمة للطلب
    max_discount: 50,               // أقصى خصم (للنسبة المئوية)
    
    // الحدود
    usage_limit: 100,               // عدد مرات الاستخدام
    used_count: 0,                  // عدد المستخدم
    
    // التواريخ
    start_date: Timestamp,
    end_date: Timestamp,
    is_active: true,
    
    created_at: Timestamp
}
```

---

## 📊 Categories (الفئات)

```javascript
{
    name: "شيبسي",
    name_en: "Chips",
    icon: "fa-solid fa-cookie",     // أيقونة
    image: "https://...",           // صورة الفئة
    
    display_order: 1,               // ترتيب العرض
    is_active: true,
    
    products_count: 15,             // عدد المنتجات
    
    created_at: Timestamp
}
```

---

## ⚙️ Settings (الإعدادات)

```javascript
{
    // معلومات المتجر
    store_name: "El Fager Store",
    store_logo: "https://...",
    store_description: "أفضل متجر في المنطقة",
    
    // التواصل
    phone: "01234567890",
    email: "store@example.com",
    whatsapp: "01234567890",
    
    // العنوان
    address: "شارع 123، القاهرة",
    
    // ساعات العمل
    working_hours: {
        saturday: { open: "09:00", close: "23:00", is_open: true },
        sunday: { open: "09:00", close: "23:00", is_open: true },
        // ...
    },
    
    // الألوان والتخصيص
    theme: {
        primary_color: "#6366f1",
        secondary_color: "#10b981",
        logo: "https://..."
    },
    
    // وضع الصيانة
    maintenance_mode: false,
    maintenance_message: "نعتذر، المتجر مغلق حالياً",
    
    // الإشعارات
    notifications: {
        email: true,
        sms: true,
        sound: true
    },
    
    updated_at: Timestamp
}
```

---

## 📈 Statistics (الإحصائيات)

```javascript
{
    date: "2026-02-10",             // التاريخ
    
    // المبيعات
    total_sales: 5000,
    total_orders: 50,
    completed_orders: 45,
    cancelled_orders: 5,
    
    // المنتجات
    products_sold: 150,
    top_products: [
        { id: "prod_123", name: "شيبسي", sold: 30 }
    ],
    
    // العملاء
    new_customers: 5,
    returning_customers: 20,
    
    created_at: Timestamp
}
```

---

## 🔔 Notifications (الإشعارات)

```javascript
{
    type: "new_order",              // new_order, low_stock, new_customer
    title: "طلب جديد",
    message: "لديك طلب جديد من أحمد",
    
    related_id: "order_123",        // ID الطلب/المنتج
    
    is_read: false,
    
    created_at: Timestamp
}
```

---

## 📝 ملاحظات مهمة:

### التوافق مع الكود الحالي:
- البنية الجديدة **متوافقة** مع الكود القديم
- الحقول القديمة (name, price, image) ستبقى تعمل
- سيتم إضافة الحقول الجديدة تدريجياً

### الترقية التدريجية:
1. المنتجات القديمة ستعمل بدون مشاكل
2. المنتجات الجديدة ستحتوي على جميع الحقول
3. يمكن تحديث المنتجات القديمة من صفحة التعديل

---

**البنية جاهزة للتطبيق!** 🚀
