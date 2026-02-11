import { auth, signInWithEmailAndPassword } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button');

    // UI Loading State
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري التحقق...';
    submitBtn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Signed in 
        const user = userCredential.user;
        console.log('User signed in:', user.uid);

        // Success Animation or Redirect
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم بنجاح';
        submitBtn.style.background = 'var(--success)';

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login Error:', error.code, error.message);

        // Error Feedback
        let errorMsg = 'حدث خطأ أثناء تسجيل الدخول.';
        if (error.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صالح.';
        if (error.code === 'auth/user-not-found') errorMsg = 'لم يتم العثور على مستخدم بهذا البريد.';
        if (error.code === 'auth/wrong-password') errorMsg = 'كلمة المرور غير صحيحة.';
        if (error.code === 'auth/invalid-credential') errorMsg = 'بيانات الاعتماد غير صحيحة.'; // New in recent SDKs

        alert(errorMsg);

        // Reset Button
        submitBtn.innerHTML = originalBtnContent;
        submitBtn.disabled = false;
        submitBtn.style.background = ''; // Reset to CSS default
    }
});

// --- Google Login Logic ---
window.loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log('Google User signed in:', user.email);

        // Success Feedback
        Toastify({ text: "تم تسجيل الدخول بواسطة Google", style: { background: "green" } }).showToast();

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        console.error('Google Login Error:', error);
        alert('فشل تسجيل الدخول عبر Google: ' + error.message);
    }
};
