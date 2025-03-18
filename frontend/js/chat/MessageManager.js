import { messagesContainer } from './constants.js';
import { setChatHeading } from './ui.js';
import { Message } from './message.js';

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

// Function to retrieve and display detailed messages for a specific bubble ID
export async function loadMessages(bubbleID, bubbleName) {
    try {
        console.log(`Loading dynamic messages for bubble ID: ${bubbleID}`); // Debug statement
        const dynamicResponse = await window.pywebview.api.get_dynamicdetailed_messages(bubbleID);
        console.log('Dynamic response retrieved:', dynamicResponse); // Debug statement

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
                    
                    const messageWrapper = document.createElement('div');
                    messageWrapper.classList.add('message-wrapper');
                    
                    const contentElement = document.createElement('div');
                    contentElement.classList.add('message-content');
                    
                    // Add content with URL parsing
                    contentElement.innerHTML = parseUrls(content);
                    
                    messageWrapper.appendChild(contentElement);
                    messageElement.appendChild(messageWrapper);
                    
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
        // Send message to backend
        const response = await window.pywebview.api.send_message(chatID, messageText, userId, null);
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
            
            // Create and append the message element
            const messageElement = message.createElement();
            messageElement.classList.add('message-new'); // Add animation class
            
            // Check if we need to create a new group or append to existing
            const lastGroup = messagesContainer.lastElementChild;
            if (lastGroup && lastGroup.getAttribute('data-author-id') === message.user.id) {
                // Append to existing group
                const messageContentGroup = lastGroup.querySelector('.message-content-group');
                const newMessage = document.createElement('div');
                newMessage.classList.add('message');
                
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('message-wrapper');
                
                const contentElement = document.createElement('div');
                contentElement.classList.add('message-content');
                contentElement.innerHTML = parseUrls(message.content);
                
                messageWrapper.appendChild(contentElement);
                newMessage.appendChild(messageWrapper);
                messageContentGroup.appendChild(newMessage);
            } else {
                // Create new group
                messagesContainer.appendChild(messageElement);
            }
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
}
