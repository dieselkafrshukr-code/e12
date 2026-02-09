// Main Dashboard Logic

console.log('Dashboard initialized');

// Sound Effect for new orders
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Example sound URL

// Simulated Real-time Order Listener
function initRealTimeUpdates() {
    console.log('Listening for real-time updates...');

    // In a real app, this would be Supabase.channel() or Firebase.onSnapshot()
    // For now, we simulate a check every 30 seconds
    setInterval(() => {
        checkForNewOrders();
    }, 30000);
}

function checkForNewOrders() {
    // API Call to check for new status
    // if (newOrder) {
    //     playNotification();
    //     updateOrdersTable();
    //     updateStats();
    // }
    console.log('Checking for new orders...');
}

function playNotification() {
    notificationSound.play().catch(e => console.log('Audio play failed (user interaction required first):', e));
}

// Active Link Handling based on URL
document.addEventListener('DOMContentLoaded', () => {
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

    initRealTimeUpdates();
});
