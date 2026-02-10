import { auth, db, doc, getDoc, setDoc, updateDoc, onAuthStateChanged, signOut } from './firebase-config.js';

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'index.html';
    else loadSettings();
});

window.logout = () => { signOut(auth); window.location.href = 'index.html'; };

// Load WhatsApp Settings
async function loadSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "whatsapp"));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();

            // API Settings
            document.getElementById('whatsappNumber').value = settings.phone || '';
            document.getElementById('apiToken').value = settings.apiToken || '';
            document.getElementById('apiProvider').value = settings.provider || '';

            // Auto-send settings
            document.getElementById('autoOrderConfirmation').checked = settings.autoOrderConfirmation !== false;
            document.getElementById('autoShippingUpdate').checked = settings.autoShippingUpdate !== false;
            document.getElementById('autoDeliveryConfirmation').checked = settings.autoDeliveryConfirmation !== false;
            document.getElementById('autoLowStockAlert').checked = settings.autoLowStockAlert || false;

            // Templates
            document.getElementById('templateOrderConfirmation').value = settings.templates?.order_confirmation || document.getElementById('templateOrderConfirmation').value;
            document.getElementById('templateShippingUpdate').value = settings.templates?.shipping_update || document.getElementById('templateShippingUpdate').value;
            document.getElementById('templateDeliveryConfirmation').value = settings.templates?.delivery_confirmation || document.getElementById('templateDeliveryConfirmation').value;
            document.getElementById('templateLowStockAlert').value = settings.templates?.low_stock_alert || document.getElementById('templateLowStockAlert').value;

            // Update connection status
            if (settings.phone && settings.apiToken) {
                document.getElementById('connectionStatus').textContent = 'متصل';
                document.getElementById('connectionStatus').className = 'badge bg-success';
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save API Settings
document.getElementById('apiSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "settings", "whatsapp"), {
            phone: document.getElementById('whatsappNumber').value,
            apiToken: document.getElementById('apiToken').value,
            provider: document.getElementById('apiProvider').value,
            updated_at: new Date()
        }, { merge: true });

        Toastify({ text: "تم حفظ إعدادات API بنجاح!", style: { background: "green" } }).showToast();
        document.getElementById('connectionStatus').textContent = 'متصل';
        document.getElementById('connectionStatus').className = 'badge bg-success';
    } catch (error) {
        console.error(error);
        alert('فشل حفظ الإعدادات');
    }
});

// Save Auto-send Settings
document.getElementById('autoSendSettings')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "settings", "whatsapp"), {
            autoOrderConfirmation: document.getElementById('autoOrderConfirmation').checked,
            autoShippingUpdate: document.getElementById('autoShippingUpdate').checked,
            autoDeliveryConfirmation: document.getElementById('autoDeliveryConfirmation').checked,
            autoLowStockAlert: document.getElementById('autoLowStockAlert').checked,
            updated_at: new Date()
        }, { merge: true });

        Toastify({ text: "تم حفظ التفضيلات بنجاح!", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
        alert('فشل حفظ التفضيلات');
    }
});

// Save Template
window.saveTemplate = async (templateType) => {
    try {
        const templates = {};
        templates[templateType] = document.getElementById(`template${templateType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`).value;

        await setDoc(doc(db, "settings", "whatsapp"), {
            templates: templates
        }, { merge: true });

        Toastify({ text: "تم حفظ القالب بنجاح!", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
        alert('فشل حفظ القالب');
    }
};

// Test Template
window.testTemplate = async (templateType) => {
    const settingsDoc = await getDoc(doc(db, "settings", "whatsapp"));
    if (!settingsDoc.exists() || !settingsDoc.data().phone || !settingsDoc.data().apiToken) {
        alert('يرجى ضبط إعدادات API أولاً!');
        return;
    }

    const template = document.getElementById(`template${templateType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`).value;

    // Replace variables with sample data
    const testMessage = template
        .replace(/{{customer_name}}/g, 'أحمد محمد')
        .replace(/{{order_id}}/g, '12345')
        .replace(/{{total_price}}/g, '250.00')
        .replace(/{{store_name}}/g, 'EL FAGER Store')
        .replace(/{{tracking_number}}/g, 'TRK123456')
        .replace(/{{tracking_link}}/g, 'https://track.example.com/123456')
        .replace(/{{review_link}}/g, 'https://store.example.com/review')
        .replace(/{{product_name}}/g, 'شيبسي ليز')
        .replace(/{{stock}}/g, '5')
        .replace(/{{dashboard_link}}/g, 'https://dashboard.example.com');

    alert('رسالة الاختبار:\n\n' + testMessage);

    // في الواقع، ستقوم بإرسال الرسالة عبر API
    console.log('Test message:', testMessage);
};

// Send WhatsApp Message (Helper Function)
export async function sendWhatsAppMessage(phone, message) {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "whatsapp"));
        if (!settingsDoc.exists()) {
            console.warn('WhatsApp settings not configured');
            return false;
        }

        const settings = settingsDoc.data();
        if (!settings.phone || !settings.apiToken) {
            console.warn('WhatsApp API credentials missing');
            return false;
        }

        // Example: Twilio API
        if (settings.provider === 'twilio') {
            const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa('YOUR_ACCOUNT_SID:' + settings.apiToken),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'To': `whatsapp:${phone}`,
                    'From': `whatsapp:${settings.phone}`,
                    'Body': message
                })
            });

            return response.ok;
        }

        // For custom implementation
        console.log('Send WhatsApp:', { phone, message });
        return true;

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return false;
    }
}

// Send Order Confirmation
export async function sendOrderConfirmation(orderData) {
    const settingsDoc = await getDoc(doc(db, "settings", "whatsapp"));
    if (!settingsDoc.exists() || !settingsDoc.data().autoOrderConfirmation) return;

    const settings = settingsDoc.data();
    let message = settings.templates?.order_confirmation || 'تم استلام طلبك #{{order_id}}';

    message = message
        .replace(/{{customer_name}}/g, orderData.customer_name)
        .replace(/{{order_id}}/g, orderData.order_id)
        .replace(/{{total_price}}/g, orderData.total_price)
        .replace(/{{store_name}}/g, 'EL FAGER Store');

    await sendWhatsAppMessage(orderData.customer_phone, message);
}

// Quick Actions
window.sendBulkMessage = () => {
    alert('ميزة الرسائل الجماعية - قريباً!');
};

window.viewMessageHistory = () => {
    alert('سجل الرسائل - قريباً!');
};

window.openWhatsAppGuide = () => {
    window.open('WHATSAPP_GUIDE.md', '_blank');
};
