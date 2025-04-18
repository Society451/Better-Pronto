const codeInputs = document.querySelectorAll('.code-input');
const clearButton = document.getElementById('clear-button');

// Get email from session storage
const userEmail = sessionStorage.getItem('userEmail') || '';

codeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && input.value === '' && index > 0) {
            codeInputs[index - 1].focus();
        } else if (event.key === 'Delete' && index < codeInputs.length - 1) {
            codeInputs[index + 1].value = '';
            codeInputs[index + 1].focus();
        } else if (event.key === 'ArrowLeft' && index > 0) {
            codeInputs[index - 1].focus();
        } else if (event.key === 'ArrowRight' && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        } else if (event.ctrlKey && event.key === 'a') {
            event.preventDefault();
            codeInputs.forEach(input => input.select());
        }
    });

    input.addEventListener('paste', (event) => {
        const paste = (event.clipboardData || window.clipboardData).getData('text');
        const pasteArray = paste.split('');
        codeInputs.forEach((input, i) => {
            input.value = pasteArray[i] || '';
        });
        event.preventDefault();
    });
});

clearButton.addEventListener('click', () => {
    codeInputs.forEach(input => input.value = '');
    codeInputs[0].focus();
});

document.getElementById('verification-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const code = Array.from(codeInputs).map(input => input.value).join('');
    console.log(`Verification code entered: ${code}`);
    
    if (!userEmail) {
        document.getElementById('error-message').textContent = "Session expired. Please go back to login.";
        return;
    }
    
    try {
        const response = await fetch('/api/handle_verification_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                code: code,
                email: userEmail
            })
        });
        
        const data = await response.json();
        const errorMessage = document.getElementById('error-message');
        
        if (!response.ok) {
            errorMessage.textContent = data.error || "Invalid verification code. Please try again.";
        } else {
            errorMessage.textContent = "";
            // Clear session storage
            sessionStorage.removeItem('userEmail');
            window.location.href = "/"; // Redirect to main app
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('error-message').textContent = "An unexpected error occurred. Please try again.";
    }
});
