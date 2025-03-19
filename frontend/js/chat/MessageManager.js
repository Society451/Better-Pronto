import { messagesContainer } from './constants.js';
import { setChatHeading } from './ui.js';
import { Message, Toast } from './message.js';

// Function to parse URLs in text and convert them to clickable links
function parseUrls(text) {
    if (!text) return '';
    
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with anchor tags
    return text.replace(urlRegex, url => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

// Create action buttons for a message
function createMessageActions(messageId) {
    const actions = document.createElement('div');
    actions.classList.add('message-actions');
    
    const deleteBtn = document.createElement('div');
    deleteBtn.classList.add('message-action-btn', 'delete');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete Message (Hold Shift for quick delete)';
    
    deleteBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        
        if (!messageId) {
            console.error('No message ID available for deletion');
            return;
        }
        
        // Get quick delete setting from localStorage
        let useQuickDelete = false;
        try {
            const settings = JSON.parse(localStorage.getItem('chatSettings'));
            useQuickDelete = settings && settings.quickDelete === true;
        } catch (e) {
            console.error('Error parsing settings:', e);
        }
        
        // Get only the specific message being clicked (not the group)
        const messageElement = event.target.closest('.message');
        
        // Delete immediately if shift is pressed or quick delete is enabled in settings
        if (event.shiftKey || useQuickDelete) {
            await deleteMessage(messageId, messageElement);
        } else {
            showDeleteConfirmation(messageId, messageElement);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            deleteBtn.classList.add('shift-active');
            deleteBtn.title = 'Quick delete message (without confirmation)';
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            deleteBtn.classList.remove('shift-active');
            deleteBtn.title = 'Delete Message (Hold Shift for quick delete)';
        }
    });
    
    actions.appendChild(deleteBtn);
    return actions;
}

// Show delete confirmation dialog
function showDeleteConfirmation(messageId, messageElement) {
    let modal = document.getElementById('delete-confirmation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-confirmation-modal';
        modal.className = 'delete-confirmation-modal';
        
        modal.innerHTML = `
            <div class="delete-confirmation-content">
                <h3>Delete Message</h3>
                <p>Are you sure you want to delete this message?</p>
                <div class="delete-confirmation-buttons">
                    <button class="delete-confirmation-btn cancel">Cancel</button>
                    <button class="delete-confirmation-btn delete">Delete</button>
                </div>
                <div class="delete-confirmation-tip">Tip: Hold Shift while clicking delete for quick deletion or enable Quick Delete in Settings</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
        
        modal.querySelector('.cancel').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Replace delete button to avoid event listener buildup
    const deleteButton = modal.querySelector('.delete');
    const newDeleteButton = deleteButton.cloneNode(true);
    deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
    
    // Add new event listener
    newDeleteButton.addEventListener('click', async () => {
        modal.classList.remove('active');
        await deleteMessage(messageId, messageElement);
    });
    
    modal.classList.add('active');
}

// Delete a message
async function deleteMessage(messageId, messageElement) {
    try {
        const response = await window.pywebview.api.delete_message(messageId);
        if (response?.ok) {
            console.log(`Deleting message with ID: ${messageId}`);
            
            // Find the proper element to delete
            let elementToDelete = messageElement;
            const messageGroup = messageElement.closest('.message-group');
            
            // If this is the only message in a group, remove the whole group
            if (messageGroup) {
                const messagesInGroup = messageGroup.querySelectorAll('.message');
                if (messagesInGroup.length === 1) {
                    elementToDelete = messageGroup;
                }
            }
            
            // Apply deletion animation
            elementToDelete.classList.add('deleting');
            elementToDelete.style.transition = 'opacity 0.2s ease, height 0.2s ease, margin 0.2s ease, padding 0.2s ease';
            elementToDelete.style.opacity = '0';
            elementToDelete.style.height = '0';
            elementToDelete.style.margin = '0';
            elementToDelete.style.padding = '0';
            elementToDelete.style.overflow = 'hidden';
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                try {
                    if (elementToDelete && elementToDelete.parentNode) {
                        elementToDelete.parentNode.removeChild(elementToDelete);
                    }
                } catch (err) {
                    console.error('Error removing element:', err);
                }
            }, 250);
            
            Toast.show('Message deleted successfully', 'success');
        } else {
            const errorMessage = response?.error === 'MESSAGE_ACCESSDENIED' 
                ? 'You do not have permission to delete this message' 
                : (response?.error || 'Failed to delete message');
            
            Toast.show(errorMessage, 'error');
            console.error('Failed to delete message:', response);
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        Toast.show('Error connecting to server', 'error');
    }
}

// Function to retrieve and display detailed messages for a specific bubble ID
export async function loadMessages(bubbleID, bubbleName) {
    try {
        console.log(`Loading dynamic messages for bubble ID: ${bubbleID}`);
        const dynamicResponse = await window.pywebview.api.get_dynamicdetailed_messages(bubbleID);
        console.log('Dynamic response retrieved:', dynamicResponse);

        if (!dynamicResponse || typeof dynamicResponse !== 'object' || !Array.isArray(dynamicResponse.messages)) {
            console.error("Invalid dynamic response format received:", dynamicResponse);
            return;
        }

        // Clear messagesContainer before adding messages
        messagesContainer.innerHTML = '';
        
        const dynamicMessages = dynamicResponse.messages.reverse(); // Reverse the order of the messages

        if (dynamicMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            // Group messages by author for Discord-style display
            let currentAuthor = null;
            let currentGroup = null;
            let lastTimestamp = null;
            
            dynamicMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing dynamic message:', msg);
                const content = msg.message || msg.content || '';
                const author = msg.author || 'Unknown';
                const timestamp = msg.time_of_sending || new Date().toISOString();
                const user = { 
                    fullname: msg.author || 'Unknown', 
                    profilepicurl: msg.profilepicurl,
                    id: msg.author_id || author // Use author_id if available, otherwise use author name
                };
                const messageId = msg.message_id;
                
                // Check if this message should be part of the current group
                // Create a new group if:
                // 1. Author changed
                // 2. More than 5 minutes passed since last message
                const msgTime = new Date(timestamp).getTime();
                const timeDiff = lastTimestamp ? (msgTime - lastTimestamp) / (1000 * 60) : 0; // Difference in minutes
                
                if (!currentAuthor || currentAuthor !== user.id || timeDiff > 5) {
                    // Create a new message element
                    const message = new Message(
                        content, 
                        author, 
                        timestamp, 
                        user, 
                        false, 
                        msg.edit_count, 
                        msg.last_edited,
                        messageId
                    );
                    
                    // Add complete message group to container
                    const messageElement = message.createElement();
                    messagesContainer.appendChild(messageElement);
                    
                    // Update tracking variables
                    currentAuthor = user.id;
                    currentGroup = messageElement;
                } else {
                    // This message belongs to the same author and is close in time
                    
                    // Let's add it to the current group by modifying the DOM
                    
                    // Create a simplified message element (without header and avatar)
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');
                    messageElement.setAttribute('data-message-id', messageId);
                    
                    const messageWrapper = document.createElement('div');
                    messageWrapper.classList.add('message-wrapper');
                    
                    const contentElement = document.createElement('div');
                    contentElement.classList.add('message-content');
                    
                    // Add content with URL parsing
                    contentElement.innerHTML = parseUrls(content);
                    
                    messageWrapper.appendChild(contentElement);
                    messageElement.appendChild(messageWrapper);
                    
                    // Add action buttons (delete icon) to the message
                    messageElement.appendChild(createMessageActions(messageId));
                    
                    // Find the message content group in the current group
                    const messageContentGroup = currentGroup.querySelector('.message-content-group');
                    messageContentGroup.appendChild(messageElement);
                }
                
                // Update timestamp for next comparison
                lastTimestamp = msgTime;
            });
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        setChatHeading(bubbleName); // Update chat heading with the bubble name
        
    } catch (error) {
        console.error("Error loading messages:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
}

// Function to send a new message
export async function sendMessage(chatID, messageText, userId) {
    try {
        // Add visual feedback for message sending
        const sendingIndicator = document.createElement('div');
        sendingIndicator.className = 'sending-message-indicator';
        sendingIndicator.innerHTML = '<div class="sending-dot"></div><div class="sending-dot"></div><div class="sending-dot"></div>';
        messagesContainer.appendChild(sendingIndicator);
        
        // Send message to backend
        const response = await window.pywebview.api.send_message(chatID, messageText, userId, null);
        
        // Remove sending indicator
        if (sendingIndicator.parentNode) {
            sendingIndicator.parentNode.removeChild(sendingIndicator);
        }
        
        if (response && response.ok && response.message) {
            // Create message from response data
            const messageData = response.message;
            const message = new Message(
                messageData.message,
                messageData.user.fullname,
                messageData.created_at,
                messageData.user,
                false,
                messageData.user_edited_version,
                messageData.user_edited_at,
                messageData.id
            );
            
            // Check if we need to create a new group or append to existing
            const lastGroup = messagesContainer.lastElementChild;
            if (lastGroup && 
                lastGroup.classList.contains('message-group') && 
                lastGroup.getAttribute('data-author-id') === String(message.user.id)) {
                // Append to existing group
                const messageContentGroup = lastGroup.querySelector('.message-content-group');
                const newMessage = document.createElement('div');
                newMessage.classList.add('message', 'message-new');
                newMessage.setAttribute('data-message-id', messageData.id);
                
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('message-wrapper');
                
                const contentElement = document.createElement('div');
                contentElement.classList.add('message-content');
                contentElement.innerHTML = parseUrls(message.content);
                
                messageWrapper.appendChild(contentElement);
                newMessage.appendChild(messageWrapper);
                
                // Add action buttons (delete icon) to the message
                newMessage.appendChild(createMessageActions(messageData.id));
                
                messageContentGroup.appendChild(newMessage);
            } else {
                // Create new group
                const messageElement = message.createElement();
                messageElement.classList.add('message-new');
                messagesContainer.appendChild(messageElement);
            }
            
            // Scroll to bottom after adding the message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error sending message:", error);
        Toast.show('Failed to send message', 'error');
        return false;
    }
}

// Make these functions available to be imported by message.js
export { createMessageActions, showDeleteConfirmation, deleteMessage };
