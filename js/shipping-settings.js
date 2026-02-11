import { supabaseData } from './supabase-config.js';

// Load shipping settings on page load
document.addEventListener('DOMContentLoaded', async () => {
    const shippingPriceInput = document.getElementById('shippingPrice');
    const shippingStatusCheck = document.getElementById('shippingStatus');

    if (shippingPriceInput && shippingStatusCheck) {
        try {
            const config = await supabaseData.getShippingConfig();
            shippingPriceInput.value = config.price || 0;
            shippingStatusCheck.checked = config.enabled !== false;
        } catch (error) {
            console.error('Error loading shipping config:', error);
        }
    }
});

// Function to save shipping settings
window.saveShippingSettings = async () => {
    const price = parseFloat(document.getElementById('shippingPrice').value) || 0;
    const enabled = document.getElementById('shippingStatus').checked;

    const saveBtn = document.querySelector('.btn-save-shipping');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        await supabaseData.updateShippingConfig({ price, enabled });
        Toastify({ text: "تم حفظ إعدادات الشحن في Supabase!", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error('Error saving shipping config:', error);
        alert('فشل حفظ إعدادات الشحن');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'حفظ التغييرات';
        }
    }
};
