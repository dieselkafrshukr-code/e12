import { auth, db, collection, addDoc, serverTimestamp } from './firebase-config.js';

export async function logActivity(action, details = {}) {
    if (!auth.currentUser) return;

    try {
        await addDoc(collection(db, "activity_logs"), {
            userId: auth.currentUser.uid,
            userEmail: auth.currentUser.email,
            userName: auth.currentUser.email.split('@')[0],
            action: action,
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error('Error logging activity:', e);
    }
}
