document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // In a real app, validation and regular authentication API calls would be here
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Authenticating:', email);
    
    // Simulating login delay
    const submitBtn = e.target.querySelector('button');
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> جاري التحقق...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }, 1500);
});
