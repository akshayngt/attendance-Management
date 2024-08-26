
document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    // Get form values
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Perform validation
    if (username && password) {
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_name: username, password: password })
            });

            const resp = await response.json();

            if (response.ok && resp.result) {
                // Handle login success
                document.getElementById('loginResult').style.display = 'block';
                document.getElementById('displayUsername').textContent = resp.user.user_name;
                document.getElementById('displayRememberMe').textContent = rememberMe ? 'Yes' : 'No';
                localStorage.setItem('user', JSON.stringify(resp.user));
                // Redirect based on role
                if (resp.user.user_role === 'admin') {
                    window.location.href = 'dashboard.html';
                } else if (resp.user.user_role === 'employee') {
                    window.location.href = 'attendance.html';
                }
            } else {
                // Handle login failure
                alert(resp.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        }
    } else {
        alert('Please enter both username and password.');
    }
});
