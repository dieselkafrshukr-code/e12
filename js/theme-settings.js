import { auth, db, doc, getDoc, setDoc, onAuthStateChanged, signOut } from './firebase-config.js';

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'index.html';
    else loadThemeSettings();
});

window.logout = () => { signOut(auth); window.location.href = 'index.html'; };

// Predefined themes
const themes = {
    modern: {
        primary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        borderRadius: '8px',
        backgroundOpacity: '20%',
        fontFamily: "'Inter', sans-serif"
    },
    classic: {
        primary: '#1f2937',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#dc2626',
        borderRadius: '4px',
        backgroundOpacity: '30%',
        fontFamily: "'Cairo', sans-serif"
    },
    minimal: {
        primary: '#000000',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        borderRadius: '0px',
        backgroundOpacity: '10%',
        fontFamily: "'Roboto', sans-serif"
    },
    ocean: {
        primary: '#0ea5e9',
        success: '#06b6d4',
        warning: '#f59e0b',
        danger: '#ef4444',
        borderRadius: '12px',
        backgroundOpacity: '25%',
        fontFamily: "'Inter', sans-serif"
    }
};

// Load theme settings
async function loadThemeSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "theme"));
        if (settingsDoc.exists()) {
            const theme = settingsDoc.data();
            applyThemeSettings(theme);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

// Apply theme
window.applyTheme = async (themeName) => {
    const theme = themes[themeName];
    if (!theme) return;

    applyThemeSettings(theme);

    try {
        await setDoc(doc(db, "settings", "theme"), {
            ...theme,
            name: themeName,
            updated_at: new Date()
        });

        Toastify({ text: `تم تطبيق سمة ${themeName} بنجاح!`, style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
    }
};

// Apply custom theme
window.applyCustomTheme = () => {
    const theme = {
        primary: document.getElementById('primaryColor').value,
        success: document.getElementById('successColor').value,
        warning: document.getElementById('warningColor').value,
        danger: document.getElementById('dangerColor').value,
        borderRadius: document.getElementById('borderRadius').value + 'px',
        backgroundOpacity: document.getElementById('backgroundOpacity').value + '%',
        fontFamily: document.getElementById('fontFamily').value
    };

    applyThemeSettings(theme);
};

// Save custom theme
window.saveCustomTheme = async () => {
    const theme = {
        primary: document.getElementById('primaryColor').value,
        success: document.getElementById('successColor').value,
        warning: document.getElementById('warningColor').value,
        danger: document.getElementById('dangerColor').value,
        borderRadius: document.getElementById('borderRadius').value + 'px',
        backgroundOpacity: document.getElementById('backgroundOpacity').value + '%',
        fontFamily: document.getElementById('fontFamily').value,
        name: 'custom'
    };

    try {
        await setDoc(doc(db, "settings", "theme"), {
            ...theme,
            updated_at: new Date()
        });

        Toastify({ text: "تم حفظ السمة المخصصة بنجاح!", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
        alert('فشل حفظ السمة');
    }
};

// Apply theme settings to DOM
function applyThemeSettings(theme) {
    document.documentElement.style.setProperty('--bs-primary', theme.primary);
    document.documentElement.style.setProperty('--bs-success', theme.success);
    document.documentElement.style.setProperty('--bs-warning', theme.warning);
    document.documentElement.style.setProperty('--bs-danger', theme.danger);
    document.documentElement.style.setProperty('--border-radius', theme.borderRadius);
    document.documentElement.style.setProperty('--bg-opacity', theme.backgroundOpacity);
    document.body.style.fontFamily = theme.fontFamily;

    // Update inputs
    if (document.getElementById('primaryColor')) {
        document.getElementById('primaryColor').value = theme.primary;
        document.getElementById('primaryColorText').value = theme.primary;
        document.getElementById('successColor').value = theme.success;
        document.getElementById('successColorText').value = theme.success;
        document.getElementById('warningColor').value = theme.warning;
        document.getElementById('warningColorText').value = theme.warning;
        document.getElementById('dangerColor').value = theme.danger;
        document.getElementById('dangerColorText').value = theme.danger;
        document.getElementById('borderRadius').value = parseInt(theme.borderRadius);
        document.getElementById('backgroundOpacity').value = parseInt(theme.backgroundOpacity);
        document.getElementById('fontFamily').value = theme.fontFamily;
    }
}

// Reset theme
window.resetTheme = () => {
    applyTheme('modern');
};

// Change language
window.changeLanguage = async () => {
    const lang = document.getElementById('languageSelect').value;

    try {
        await setDoc(doc(db, "settings", "general"), {
            language: lang,
            updated_at: new Date()
        }, { merge: true });

        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        Toastify({ text: "تم تغيير اللغة بنجاح! قد تحتاج لإعادة تحميل الصفحة.", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
    }
};

// Change currency
window.changeCurrency = async () => {
    const currency = document.getElementById('currencySelect').value;

    try {
        await setDoc(doc(db, "settings", "general"), {
            currency: currency,
            updated_at: new Date()
        }, { merge: true });

        Toastify({ text: "تم تغيير العملة بنجاح!", style: { background: "green" } }).showToast();
    } catch (error) {
        console.error(error);
    }
};

// Export theme functions for other pages
export { applyThemeSettings, themes };
