// Messages state tracking
let currentMessages = [];
let currentChatId = null;
let currentChatName = null;
let isLoadingMessages = false;
let autoScrollToBottom = true; // Flag to control automatic scrolling

// Create message element from API message data
function createMessageFromAPIData(message) {
    // Create message container with appropriate class based on if it's from the current user
    const messageContainer = document.createElement('div');
    const isCurrentUser = message.author === 'You' || message.author?.includes('You'); // Consider better user identification
    messageContainer.className = `message-container ${isCurrentUser ? 'sent' : 'received'}`;
    
    // Handle both id fields - Pronto API uses 'id' while our internal format might use 'message_id'
    messageContainer.dataset.messageId = message.id || message.message_id;
    
    // Create profile picture element
    const profilePic = document.createElement('div');
    profilePic.className = 'profile-picture';
    
    // Create and add profile image if URL is provided
    if (message.profilepicurl) {
        const img = document.createElement('img');
        img.src = message.profilepicurl;
        img.alt = message.author || 'User';
        img.className = 'profile-img';
        
        // Handle image loading errors by showing initials instead
        img.onerror = () => {
            img.style.display = 'none';
            const initials = createInitialsElement(message.author || 'User');
            profilePic.appendChild(initials);
        };
        
        profilePic.appendChild(img);
    } else {
        // If no profile pic URL, show initials
        const initials = createInitialsElement(message.author || 'User');
        profilePic.appendChild(initials);
    }
    
    // Create status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator status-offline'; // Default to offline
    profilePic.appendChild(statusIndicator);
    
    // Create message content container
    const messageElement = document.createElement('div');
    messageElement.className = 'message-content';
    
    // Create message header
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // Create sender element
    const senderElement = document.createElement('span');
    senderElement.className = 'sender';
    
    // Check for user object first, then fall back to author field
    if (message.user && message.user.fullname) {
        senderElement.textContent = message.user.fullname;
    } else {
        senderElement.textContent = message.author || 'Unknown User';
    }
    
    // Convert timestamp to readable format with improved validation
    let formattedTimestamp;
    try {
        // Handle ISO date string format from Pronto API (e.g. "2025-04-02 11:26:44")
        if (message.created_at) {
            const date = new Date(message.created_at.replace(' ', 'T'));
            if (date instanceof Date && !isNaN(date)) {
                formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                formattedTimestamp = getCurrentTime();
            }
        }
        // Fall back to time_of_sending (unix timestamp) if available
        else if (message.time_of_sending) {
            // Handle both string and number formats
            const timestamp = typeof message.time_of_sending === 'string' 
                ? parseFloat(message.time_of_sending) 
                : message.time_of_sending;
                
            // Validate if the timestamp is a valid number and in a reasonable range
            if (!isNaN(timestamp) && timestamp > 946684800) { // Jan 1, 2000 as minimum valid date
                const date = new Date(timestamp * 1000); // Convert from Unix timestamp
                
                // Check if date is valid before formatting
                if (date instanceof Date && !isNaN(date)) {
                    formattedTimestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    formattedTimestamp = getCurrentTime();
                }
            } else {
                formattedTimestamp = getCurrentTime();
            }
        } else {
            formattedTimestamp = getCurrentTime();
        }
    } catch (e) {
        console.error('Error parsing timestamp:', e, 'Original timestamp was:', message.created_at || message.time_of_sending);
        formattedTimestamp = getCurrentTime();
    }
    
    // Create timestamp element
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formattedTimestamp;
    
    // Add sender and timestamp to header
    messageHeader.appendChild(senderElement);
    messageHeader.appendChild(timestamp);
    
    // Create message text - handle both content and message fields
    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = message.content || message.message || '';
    
    // If message was edited, add an indicator
    if (message.edit_count > 0 || message.user_edited_version > 0) {
        const editedIndicator = document.createElement('span');
        editedIndicator.className = 'edited-indicator';
        editedIndicator.textContent = ' (edited)';
        messageParagraph.appendChild(editedIndicator);
    }
    
    // Add reactions if present
    if ((message.reactions && message.reactions.length > 0) || (message.reactionsummary && message.reactionsummary.length > 0)) {
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'reactions-container';
        
        // Handle both reactions and reactionsummary fields
        const reactionsList = message.reactions || message.reactionsummary || [];
        reactionsList.forEach(reaction => {
            const reactionElement = document.createElement('span');
            reactionElement.className = 'reaction';
            reactionElement.textContent = reaction.emoji || reaction.type || '👍';
            reactionElement.dataset.count = reaction.count || 1;
            reactionsContainer.appendChild(reactionElement);
        });
        
        messageElement.appendChild(reactionsContainer);
    }
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'message-delete-btn';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.title = 'Delete message';
    
    // Add header, text, and delete button to message content
    messageElement.appendChild(messageHeader);
    messageElement.appendChild(messageParagraph);
    messageElement.appendChild(deleteButton);
    
    // Add profile picture and message content to the container
    messageContainer.appendChild(profilePic);
    messageContainer.appendChild(messageElement);
    
    return messageContainer;
}

// Helper function to create an element displaying user initials
function createInitialsElement(fullName) {
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'profile-initials';
    
    // Extract initials from name
    const initials = fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    
    initialsDiv.textContent = initials;
    
    // Generate a consistent color based on the name
    const hue = stringToHue(fullName);
    initialsDiv.style.backgroundColor = `hsl(${hue}, 60%, 80%)`;
    initialsDiv.style.color = `hsl(${hue}, 80%, 30%)`;
    
    return initialsDiv;
}

// Helper function to generate a consistent hue from a string
function stringToHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
}

// Helper function to safely parse a timestamp - updated to handle both formats
function parseTimestamp(timestamp) {
    if (!timestamp) return 0;
    
    // Handle ISO date string format (e.g. "2025-04-02 11:26:44")
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
        try {
            const date = new Date(timestamp.replace(' ', 'T'));
            if (date instanceof Date && !isNaN(date)) {
                return date.getTime() / 1000; // Convert to Unix timestamp for sorting
            }
        } catch (e) {
            console.error('Error parsing ISO date string:', e);
        }
    }
    
    // Handle Unix timestamp in string format
    if (typeof timestamp === 'string') {
        const parsed = parseFloat(timestamp);
        return isNaN(parsed) ? 0 : parsed;
    }
    
    // Handle number format
    return typeof timestamp === 'number' ? timestamp : 0;
}

// Enhanced scrollToBottom function with forced scrolling
function scrollToBottom(container) {
    if (!container || !autoScrollToBottom) return;
    
    // Force immediate scroll to bottom
    container.scrollTop = container.scrollHeight;
    
    // Double-check with timeouts to ensure scrolling after any reflow
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
        
        setTimeout(() => {
            // Final attempt with higher priority
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }, 100);
    }, 10);
    
    console.log('Scrolling to bottom, container height:', container.scrollHeight, 'current scroll position:', container.scrollTop);
}

// Render messages to the UI with improved structure
function renderMessages(messages, chatName) {
    currentMessages = messages;
    currentChatName = chatName;
    
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    // Clear existing messages
    messagesContainer.innerHTML = '';
    
    // Show loading placeholder if we're actively loading
    if (isLoadingMessages) {
        showMessageLoadingIndicator();
        return;
    }
    
    // If no messages, show placeholder
    if (!messages || messages.length === 0) {
        showNoMessagesPlaceholder();
        return;
    }
    
    console.log('Original messages array length:', messages.length);
    
    // Sort messages by timestamp in ASCENDING order (oldest first)
    const sortedMessages = [...messages].sort((a, b) => {
        // First try using created_at field if available
        if (a.created_at && b.created_at) {
            return new Date(a.created_at.replace(' ', 'T')) - new Date(b.created_at.replace(' ', 'T'));
        }
        
        // Fall back to time_of_sending
        const timeA = parseTimestamp(a.created_at || a.time_of_sending);
        const timeB = parseTimestamp(b.created_at || b.time_of_sending);
        return timeA - timeB; // Oldest first
    });
    
    // Debug logging
    console.log("Messages sorted by timestamp (oldest first):", 
        sortedMessages.map(m => ({
            id: m.id || m.message_id,
            time: m.created_at || m.time_of_sending,
            content: (m.content || m.message)?.substring(0, 20)
        }))
    );
    
    // Reset container styles to ensure proper stacking from top to bottom
    messagesContainer.style.display = 'block';
    messagesContainer.style.overflowY = 'auto';
    messagesContainer.style.maxHeight = '100%';
    messagesContainer.style.height = '100%';
    
    // Create a wrapper div for messages to stack properly
    const messagesWrapper = document.createElement('div');
    messagesWrapper.className = 'messages-wrapper';
    messagesWrapper.style.display = 'flex';
    messagesWrapper.style.flexDirection = 'column'; 
    messagesWrapper.style.justifyContent = 'flex-start'; // Align items to the top
    messagesWrapper.style.minHeight = '100%';
    
    // Create and append message elements in order (oldest to newest)
    sortedMessages.forEach(message => {
        const messageElement = createMessageFromAPIData(message);
        messagesWrapper.appendChild(messageElement);
    });
    
    // Append wrapper to container
    messagesContainer.appendChild(messagesWrapper);
    
    // Force scroll to bottom after rendering if autoScrollToBottom is true
    if (autoScrollToBottom) {
        scrollToBottom(messagesContainer);
    }
    
    // Update window title with chat name
    document.title = `${chatName} - Better Pronto`;
}

// Show loading indicator in messages container
function showMessageLoadingIndicator() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    isLoadingMessages = true;
    
    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'messages-loading';
    loadingIndicator.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading messages...</div>
    `;
    
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(loadingIndicator);
}

// Hide message loading indicator
function hideMessageLoadingIndicator() {
    isLoadingMessages = false;
    
    // Rerender messages if we have them
    if (currentMessages.length > 0) {
        renderMessages(currentMessages, currentChatName);
    } else {
        showNoMessagesPlaceholder();
    }
}

// Show placeholder when no messages are available
function showNoMessagesPlaceholder() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'no-messages-placeholder';
    placeholder.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <p>No messages yet</p>
            <p class="hint">Start the conversation by typing a message below</p>
        </div>
    `;
    
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(placeholder);
}

// Clear the messages container
function clearMessages() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    currentMessages = [];
}

// Function to delete a message via API
async function deleteMessage(messageId) {
    if (!window.pywebview || !window.pywebview.api || !messageId) return false;
    
    try {
        const response = await window.pywebview.api.delete_message(messageId);
        if (response && response.ok) {
            // Find and remove the message from the DOM
            const messageElement = document.querySelector(`.message-container[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.classList.add('deleting');
                // Add fade-out animation
                messageElement.style.opacity = '0';
                messageElement.style.height = '0';
                messageElement.style.margin = '0';
                messageElement.style.padding = '0';
                messageElement.style.transition = 'opacity 0.3s, height 0.3s, margin 0.3s, padding 0.3s';
                
                // Remove from DOM after animation completes
                setTimeout(() => {
                    messageElement.remove();
                }, 300);
            }
            
            // Remove from current messages array
            const index = currentMessages.findIndex(msg => msg.message_id === messageId);
            if (index !== -1) {
                currentMessages.splice(index, 1);
            }
            
            return true;
        } else {
            console.error('Error deleting message:', response?.error || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
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

// Initialize the messages component
document.addEventListener('DOMContentLoaded', function() {
    // Show empty state initially
    showNoMessagesPlaceholder();
    
    // Setup scrolling observer to check if scrolling works
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        // Track user scrolling to prevent automatic scrolling when user is reading history
        messagesContainer.addEventListener('scroll', () => {
            // If user scrolls up more than 100px from bottom, disable auto-scroll
            const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
            autoScrollToBottom = isNearBottom;
            
            console.log('Scroll event detected, position:', messagesContainer.scrollTop, 
                        'of', messagesContainer.scrollHeight, 
                        'auto-scroll:', autoScrollToBottom);
        });
    }
    
    // Listen for chat selection changes from sidebar
    document.addEventListener('chatSelected', function(e) {
        if (e.detail && e.detail.chatId) {
            currentChatId = e.detail.chatId;
            // Reset auto-scroll when changing chats
            autoScrollToBottom = true;
        }
    });
    
    // Set up global shift key tracking for delete functionality
    let shiftKeyPressed = false;
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Shift') {
            shiftKeyPressed = true;
            document.querySelectorAll('.message-delete-btn').forEach(btn => {
                btn.classList.add('delete-active');
            });
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Shift') {
            shiftKeyPressed = false;
            document.querySelectorAll('.message-delete-btn').forEach(btn => {
                btn.classList.remove('delete-active');
            });
        }
    });
    
    // Event delegation for delete buttons
    document.addEventListener('click', async function(e) {
        if (e.target.closest('.message-delete-btn')) {
            const messageContainer = e.target.closest('.message-container');
            if (messageContainer) {
                const messageId = messageContainer.dataset.messageId;
                if (messageId && window.pywebview && window.pywebview.api) {
                    const confirmed = confirm('Are you sure you want to delete this message?');
                    if (confirmed) {
                        const success = await deleteMessage(messageId);
                        if (success) {
                            console.log('Message deleted successfully');
                        } else {
                            console.error('Failed to delete message');
                        }
                    }
                }
            }
        }
    });
    
    // Expose functions for use by other components
    window.renderMessages = renderMessages;
    window.clearMessages = clearMessages;
    window.showMessageLoadingIndicator = showMessageLoadingIndicator;
    window.hideMessageLoadingIndicator = hideMessageLoadingIndicator;
    window.showNoMessagesPlaceholder = showNoMessagesPlaceholder;
    
    // Function to add a new message to the chat (used by message input component)
    window.addMessageToChat = function(messageData) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer || !currentChatId) return;
        
        let messageObj = null;
        
        // Handle different message formats:
        // 1. API response format from send_message (message inside response.message)
        if (messageData.ok === true && messageData.message) {
            messageObj = messageData.message;
        }
        // 2. Directly passed message object from API response
        else if (messageData.id && (messageData.message || messageData.content)) {
            messageObj = messageData;
        }
        // 3. Simple temporary message format from message-input.js
        else {
            messageObj = {
                id: messageData.id || `temp-${Date.now()}`,
                message: messageData.message || messageData.content,
                created_at: messageData.created_at || new Date().toISOString().replace('T', ' ').split('.')[0],
                user: messageData.user || {
                    fullname: messageData.author || 'You'
                }
            };
        }
        
        // Add to current messages
        currentMessages.push(messageObj);
        
        // Create and append message element
        const messageElement = createMessageFromAPIData(messageObj);
        
        // Find or create the messages wrapper
        let messagesWrapper = messagesContainer.querySelector('.messages-wrapper');
        if (!messagesWrapper) {
            messagesWrapper = document.createElement('div');
            messagesWrapper.className = 'messages-wrapper';
            messagesWrapper.style.display = 'flex';
            messagesWrapper.style.flexDirection = 'column';
            messagesWrapper.style.justifyContent = 'flex-start'; // Align items to the top
            messagesWrapper.style.minHeight = '100%';
            messagesContainer.appendChild(messagesWrapper);
        }
        
        // Append the new message to the wrapper
        messagesWrapper.appendChild(messageElement);
        
        // Always scroll to bottom when sending a new message
        autoScrollToBottom = true;
        scrollToBottom(messagesContainer);
        
        // If not already sending via API (we only have temp message object)
        if (!messageObj.user || messageObj.user.fullname === 'You' || messageObj.id.toString().startsWith('temp')) {
            // Send message via API if available
            const messageText = messageObj.message || messageObj.content;
            
            console.log(`Sending message to bubble ID ${currentChatId}: ${messageText}`);
            
            // Update message sending logic to use Flask API
            if (currentChatId && messageText) {
                fetch(`/api/send_message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ chatId: currentChatId, message: messageText })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Message sent via Flask API:', data);

                    if (data && data.ok && data.message) {
                        // Update the temporary message with real data
                        const tempMessageElement = messagesContainer.querySelector(`.message-container[data-message-id="${messageObj.id}"]`);
                        if (tempMessageElement) {
                            tempMessageElement.dataset.messageId = data.message.id;
                        }
                    }

                    // After successful send, refresh messages to get the proper message ID
                    if (window.triggerMessagesRefresh) {
                        window.triggerMessagesRefresh(currentChatId);
                    }
                })
                .catch(error => {
                    console.error('Error sending message via Flask API:', error);
                });
            }
        }
        
        return messageObj;
    };
});

// Make triggerMessagesRefresh available to the sidebar
window.triggerMessagesRefresh = function(bubbleId) {
    if (window.pywebview && window.pywebview.api && bubbleId) {
        const selectedChat = document.querySelector(`.chat-item[data-id="${bubbleId}"]`);
        const chatName = selectedChat ? selectedChat.querySelector('.chat-name').textContent : 'Chat';
        
        // Use the sidebar's function if available
        if (typeof triggerMessagesRefresh === 'function') {
            triggerMessagesRefresh(bubbleId);
        }
    }
};

// Initialize immediately if DOM is already loaded
if (document.readyState === "complete" || 
    document.readyState === "loaded" || 
    document.readyState === "interactive") {
    showNoMessagesPlaceholder();
}