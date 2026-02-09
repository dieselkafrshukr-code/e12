import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Global Auth Guard & Sidebar Logic
console.log('Dashboard initialized & Firebase connected');

// 1. Auth Guard: Check if user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        // Update profile UI if possible
        const profileEmail = document.querySelector('.user-profile p');
        if (profileEmail) profileEmail.innerText = user.email;
    } else {
        // User is signed out, redirect to login
        // Check if we are NOT on index.html to avoid infinite loop
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
            console.log('No user, redirecting to login...');
            window.location.href = 'index.html';
        }
    }
});

// 2. Logout Functionality
window.logout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Bind logout button and Navigation Logic
document.addEventListener('DOMContentLoaded', () => {

    // Bind Logout
    const logoutBtn = document.querySelector('.user-profile button');
    if (logoutBtn) {
        logoutBtn.removeAttribute('onclick'); // Remove the hardcoded navigation
        logoutBtn.addEventListener('click', window.logout);
    }

    // Active Link Logic
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Start Real-time updates if on dashboard
    initRealTimeUpdates();
});


// Sound Effect
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function initRealTimeUpdates() {
    // Placeholder for Firestore snapshot listener
    console.log('Real-time updates ready (Waiting for Order implementation)');
}
