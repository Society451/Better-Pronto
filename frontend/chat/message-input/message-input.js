// Function to initialize the message input component
function initMessageInput() {
    const messageInput = document.querySelector('#message-input');
    const sendButton = document.querySelector('#send-button');
    const charCounter = document.querySelector('#char-count');
    const emojiButton = document.querySelector('#emoji-button');
    const attachButton = document.querySelector('#attach-button');
    
    if (!messageInput || !sendButton) return;
    
    // Set initial state
    updateCharCounter(messageInput, charCounter);
    updateSendButtonState(messageInput.value.trim(), sendButton);
    
    // Track typing state
    let isTyping = false;
    let typingTimer = null;
    
    // Send typing indicator when user starts typing
    function sendTypingIndicator() {
        if (!isTyping && window.socket && window.currentChatId) {
            isTyping = true;
            // Emit socket event for typing - but only if we have an active socket connection
            try {
                window.socket.emit('user_typing', {
                    user_id: window.userID || '000000', // Use global user ID if available
                    thread_id: window.currentChatId,
                    bubble_id: window.currentChatId
                });
            } catch (e) {
                console.error('Error emitting typing event:', e);
            }
        }
        
        // Reset typing timer
        if (typingTimer) clearTimeout(typingTimer);
        
        // After 2 seconds of no typing, send stopped typing event
        typingTimer = setTimeout(() => {
            if (isTyping && window.socket && window.currentChatId) {
                isTyping = false;
                try {
                    window.socket.emit('user_stopped_typing', {
                        user_id: window.userID || '000000',
                        thread_id: window.currentChatId,
                        bubble_id: window.currentChatId
                    });
                } catch (e) {
                    console.error('Error emitting stopped typing event:', e);
                }
            }
        }, 2000);
    }
    
    // Auto-resize the textarea based on content
    function autoResizeTextarea() {
        // Reset height to a minimal value to get correct scrollHeight measurement
        messageInput.style.height = '0';
        
        // Set height to scrollHeight with a max limit
        const maxHeight = 120;
        const contentHeight = messageInput.scrollHeight;
        
        // Apply the new height, clamped to the maximum
        messageInput.style.height = Math.min(contentHeight, maxHeight) + 'px';
        
        // Only show scrollbar when content exceeds max height
        messageInput.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    }
    
    // Handle input for auto-resize and character count
    messageInput.addEventListener('input', function() {
        autoResizeTextarea();
        updateCharCounter(messageInput, charCounter);
        updateSendButtonState(messageInput.value.trim(), sendButton);
        
        // Send typing indicator
        sendTypingIndicator();
    });
    
    // Handle send button click
    sendButton.addEventListener('click', function() {
        if (!sendButton.classList.contains('disabled')) {
            sendMessage();
        }
    });
    
    // Handle Enter key press (send message)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !sendButton.classList.contains('disabled')) {
            e.preventDefault(); // Prevent default to avoid new line
            sendMessage();
        }
        
        // After any keydown, ensure proper sizing
        setTimeout(autoResizeTextarea, 0);
    });
    
    // Emoji button click
    if (emojiButton) {
        emojiButton.addEventListener('click', toggleEmojiPicker);
    }
    
    // Attach button click
    if (attachButton) {
        attachButton.addEventListener('click', openFileAttachment);
    }
    
    // Initial resize to ensure proper sizing on load
    setTimeout(autoResizeTextarea, 0);
}

// Function to update character counter
function updateCharCounter(inputElement, counterElement) {
    if (!inputElement || !counterElement) return;
    
    const maxLength = inputElement.getAttribute('maxlength') || 1000;
    const currentLength = inputElement.value.length;
    counterElement.textContent = currentLength;
    
    // Update counter styling based on remaining characters
    const counterParent = counterElement.parentElement;
    counterParent.classList.remove('limit-near', 'limit-reached');
    
    if (currentLength >= maxLength) {
        counterParent.classList.add('limit-reached');
    } else if (currentLength >= maxLength * 0.8) {
        counterParent.classList.add('limit-near');
    }
}

// Function to update send button state (disabled when empty)
function updateSendButtonState(messageText, sendButton) {
    if (!messageText) {
        sendButton.classList.add('disabled');
    } else {
        sendButton.classList.remove('disabled');
    }
}

// Function to send a message
function sendMessage() {
    const messageInput = document.querySelector('#message-input');
    const sendButton = document.querySelector('#send-button');
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        // Create a temporary message for immediate display
        const tempMessageObj = {
            message: messageText,
            user: {
                fullname: 'You'
            },
            created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
            id: `temp-${Date.now()}`
        };
        
        // Add temporary message to the UI
        const tempMessage = window.addMessageToChat(tempMessageObj);
        
        // Send message via API
        if (window.currentChatId && messageText) {
            fetch(`/api/send_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ chatId: window.currentChatId, message: messageText })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Message sent via API:', data);

                if (data && data.ok && data.message) {
                    // Update the temporary message with the real message data from the server
                    if (window.updateTempMessage) {
                        window.updateTempMessage(tempMessage.id, data.message);
                    }
                } else {
                    console.error('Error sending message:', data.error || 'Unknown error');
                    // Show error toast
                    if (window.showToast) {
                        window.showToast('Failed to send message', 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Error sending message:', error);
                if (window.showToast) {
                    window.showToast('Failed to send message: Network error', 'error');
                }
            });
        }
        
        // Clear the input field
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        
        // Update character count and send button state
        updateCharCounter(messageInput, document.querySelector('#char-count'));
        updateSendButtonState('', sendButton);
        
        // Focus back on the input field
        messageInput.focus();
    }
}

// Function to add a message to the chat
function addMessageToChat(messageObj) {
    const messagesContainer = document.querySelector('#messages');
    
    if (!messagesContainer) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageObj.user.fullname === 'You' ? 'sent' : 'received'}`;
    
    // Create message header
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // Create sender element
    const senderElement = document.createElement('span');
    senderElement.className = 'sender';
    senderElement.textContent = messageObj.user.fullname;
    
    // Create timestamp element
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = messageObj.created_at.split(' ')[1];
    
    // Add sender and timestamp to header
    messageHeader.appendChild(senderElement);
    messageHeader.appendChild(timestamp);
    
    // Create message text
    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = messageObj.message;
    
    // Add header and text to message
    messageElement.appendChild(messageHeader);
    messageElement.appendChild(messageParagraph);
    
    // Add message to container
    messagesContainer.appendChild(messageElement);
    
    // Scroll to the bottom of messages
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Helper function to get current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    
    // Pad with zero if needed
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutes}`;
}

// Function to toggle emoji picker (placeholder for now)
function toggleEmojiPicker() {
    // This would be implemented with an actual emoji picker library
    alert('Emoji picker functionality would be implemented here');
}

// Function to open file attachment dialog (placeholder for now)
function openFileAttachment() {
    // Create and trigger a file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,.pdf,.doc,.docx'; // Common file types
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // This would handle the file upload in a real application
        }
    });
    
    fileInput.click();
}

// Initialize message input when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMessageInput();
});

// Initialize immediately if DOM is already loaded
if (document.readyState === "complete" || 
    document.readyState === "loaded" || 
    document.readyState === "interactive") {
    initMessageInput();
}