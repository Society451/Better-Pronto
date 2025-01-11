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
