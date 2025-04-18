// Track email for verification page
let userEmail = '';

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    userEmail = email; // Store email for later use
    
    console.log('Submitting email:', email);
    
    try {
        const response = await fetch('/api/handle_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        const errorMessage = document.getElementById('error-message');
        
        if (!response.ok) {
            errorMessage.textContent = data.error || "Invalid email domain";
        } else {
            errorMessage.textContent = "";
            // Store email in session storage for verification page
            sessionStorage.setItem('userEmail', email);
            window.location.href = "/verification"; // Redirect to verification page
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('error-message').textContent = "An unexpected error occurred. Please try again.";
    }
});

// Ensure there are no errors and that any necessary functions are properly defined

// Example: If there is a function to handle login, ensure it handles responses correctly
async function handleLogin() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            displayError(data.error || "Login failed");
        } else {
            window.location.href = 'chat.html'; // Redirect to chat on successful login
        }
    } catch (error) {
        console.error("Login error:", error);
        displayError("An unexpected error occurred.");
    }
}

// Add event listener to login button
document.getElementById('login-button').addEventListener('click', () => {
    handleLogin();
});

// Function to display error messages
function displayError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}
