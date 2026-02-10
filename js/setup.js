import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_kCij187JbHoHcZwO5Ln3js5Ji86tSUw",
    authDomain: "test-97ecc.firebaseapp.com",
    projectId: "test-97ecc",
    storageBucket: "test-97ecc.firebasestorage.app",
    messagingSenderId: "743949460905",
    appId: "1:743949460905:web:09146ac145dd42eb75d0b8",
    measurementId: "G-31DYDV721K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check if system is already setup (has users in Firebase Auth)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // If already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
});

document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = e.target.querySelector('button');

    // Validate passwords match
    if (password !== confirmPassword) {
        alert('كلمات المرور غير متطابقة!');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }

    // UI Loading State
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري الإنشاء...';
    submitBtn.disabled = true;

    try {
        // Create the first admin user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Admin user created:', user.uid);

        // Success Animation
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم بنجاح';
        submitBtn.style.background = 'var(--success)';

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Setup Error:', error.code, error.message);

        // Error Feedback
        let errorMsg = 'حدث خطأ أثناء إنشاء الحساب.';
        if (error.code === 'auth/email-already-in-use') errorMsg = 'البريد الإلكتروني مستخدم بالفعل.';
        if (error.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صالح.';
        if (error.code === 'auth/weak-password') errorMsg = 'كلمة المرور ضعيفة جدًا.';

        alert(errorMsg);

        // Reset Button
        submitBtn.innerHTML = originalBtnContent;
        submitBtn.disabled = false;
        submitBtn.style.background = '';
    }
});
