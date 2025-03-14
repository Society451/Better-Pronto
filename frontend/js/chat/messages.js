import { messagesContainer } from './constants.js';
import { setChatHeading } from './ui.js';
import { Message } from './message.js';

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
            dynamicMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing dynamic message:', msg);
                const content = msg.message || msg.content || '';
                const author = msg.author || 'Unknown';
                const timestamp = msg.time_of_sending || new Date().toISOString();
                const user = { 
                    fullname: msg.author || 'Unknown', 
                    profilepicurl: msg.profilepicurl 
                };
                const messageId = msg.message_id;
                const hasImage = msg.has_image || false;
                const imageData = msg.image_data || null;

                const message = new Message(
                    content, 
                    author, 
                    timestamp, 
                    user, 
                    false, 
                    msg.edit_count, 
                    msg.last_edited,
                    messageId,
                    hasImage,
                    imageData
                );
                messagesContainer.appendChild(message.createElement()); // Display message in HTML
            });
        }

        // Debug logging for image paths
        dynamicMessages.forEach(msg => {
            if (msg.has_image && msg.image_data) {
                console.log("Message has image data:", msg.image_data);
                if (msg.image_data.is_external) {
                    console.log("External media URL:", msg.image_data.url);
                }
            }
            if (msg.media && msg.media.length > 0) {
                console.log("Message has media:", msg.media);
                
                // Look for GIFs in media
                const gifMedia = msg.media.filter(m => 
                    (m.url && m.url.toLowerCase().includes('.gif')) ||
                    (m.urlmimetype && m.urlmimetype.toLowerCase() === 'image/gif')
                );
                
                if (gifMedia.length > 0) {
                    console.log("Found GIF media:", gifMedia);
                }
            }
        });

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
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
}
