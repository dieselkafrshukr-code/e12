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

// Initialize Firebase with CDN imports (No npm required)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, getDocs, doc, getDoc };
