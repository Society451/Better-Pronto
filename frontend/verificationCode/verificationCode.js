const codeInputs = document.querySelectorAll('.code-input');
const clearButton = document.getElementById('clear-button');

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
    const response = await window.pywebview.api.handle_verification_code(code);
    console.log(response);
    const errorMessage = document.getElementById('error-message');  // Define errorMessage here
    if (response === "error") {
        errorMessage.textContent = "Invalid verification code. Please try again.";
    } else {
        errorMessage.textContent = "";
        window.location.href = "chat.html";
    }
});
