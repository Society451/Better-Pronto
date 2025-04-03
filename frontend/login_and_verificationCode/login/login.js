function waitForPywebview() {
    return new Promise((resolve) => {
        if (window.pywebview && window.pywebview.api) {
            resolve();
        } else {
            document.addEventListener('pywebviewready', resolve);
        }
    });
    }


document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    console.log('Submitting email:', email);  // Debugging statement
    const response = await window.pywebview.api.handle_email(email);
    const errorMessage = document.getElementById('error-message');
    if (response === "Invalid email domain") {
        errorMessage.textContent = response;
    } else {
        errorMessage.textContent = "";
        window.location.href = "verificationCode.html"; // Redirect to verificationCode.html
    }
});

// Ensure there are no errors and that any necessary functions are properly defined

// Example: If there is a function to handle login, ensure it handles responses correctly
async function handleLogin() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    try {
        const response = await window.pywebview.api.login(email, password);
        if (response === "Ok") {
            window.location.href = 'chat.html'; // Redirect to chat on successful login
        } else {
            displayError(response); // Display error message
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
